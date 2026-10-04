// Tools the assistant can call. Anything that reaches OTHER people (email) is staged and needs the owner's click.
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { ImapFlow } from 'imapflow';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { db } from './db.js';
import { draft as makeDraft } from './engine.js';

const FILES = `${process.env.DATA_DIR || '/data'}/files`;
fs.mkdirSync(FILES, { recursive: true });
db.exec(`CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS actions (id TEXT PRIMARY KEY, type TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', result TEXT, at TEXT NOT NULL DEFAULT (datetime('now')));`);

export const TOOL_DEFS = [
  { type: 'function', function: { name: 'search_opportunities', description: 'Cari peluang di Radar berdasarkan kata kunci, jalur, status, atau skor minimal.',
    parameters: { type: 'object', properties: { query: { type: 'string' }, track: { type: 'string', enum: ['career', 'business', 'all'] }, status: { type: 'string', enum: ['new', 'shortlist', 'sent', 'archived', 'all'] }, min_score: { type: 'integer' } } } } },
  { type: 'function', function: { name: 'get_opportunity', description: 'Ambil detail lengkap satu peluang (deskripsi, url, draft).', parameters: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] } } },
  { type: 'function', function: { name: 'set_status', description: 'Ubah status peluang: shortlist, sent (sudah dikirim pemilik), archived, new.', parameters: { type: 'object', properties: { id: { type: 'integer' }, status: { type: 'string', enum: ['new', 'shortlist', 'sent', 'archived'] } }, required: ['id', 'status'] } } },
  { type: 'function', function: { name: 'write_application_draft', description: 'Buat/ulang draft cover letter atau proposal untuk satu peluang dan simpan di Radar.', parameters: { type: 'object', properties: { id: { type: 'integer' }, lang: { type: 'string', enum: ['en', 'id'] } }, required: ['id'] } } },
  { type: 'function', function: { name: 'generate_pdf', description: 'Buat dokumen PDF (CV, cover letter, proposal, penawaran harga, laporan). Konten dalam markdown sederhana: # judul, ## subjudul, - poin, **tebal**, paragraf. Jangan mengarang fakta tentang pemilik.',
    parameters: { type: 'object', properties: { title: { type: 'string' }, filename: { type: 'string', description: 'nama file tanpa .pdf' }, content: { type: 'string' } }, required: ['title', 'content'] } } },
  { type: 'function', function: { name: 'send_email', description: 'SIAPKAN email ke orang lain (tidak langsung terkirim: pemilik harus menekan tombol konfirmasi). Bisa melampirkan PDF dari generate_pdf.',
    parameters: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, attachment_file_id: { type: 'string' } }, required: ['to', 'subject', 'body'] } } },
  { type: 'function', function: { name: 'save_gmail_draft', description: 'Simpan email sebagai DRAF di Gmail pemilik (tidak terkirim; pemilik membuka & mengirim sendiri dari Gmail). Cocok untuk lamaran/proposal yang ingin dirapikan dulu. Bisa melampirkan PDF.',
    parameters: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, attachment_file_id: { type: 'string' } }, required: ['subject', 'body'] } } },
  { type: 'function', function: { name: 'notify_me', description: 'Kirim pesan/pengingat ke pemilik sendiri lewat WhatsApp dan/atau Telegram (langsung terkirim, hanya ke pemilik).',
    parameters: { type: 'object', properties: { text: { type: 'string' }, channel: { type: 'string', enum: ['whatsapp', 'telegram', 'both'] } }, required: ['text'] } } },
];

const brief = i => ({ id: i.id, score: i.score, track: i.track, status: i.status, title: i.title, company: i.company, location: i.location, salary: i.salary, url: i.url, summary: i.summary });

// --- PDF from simple markdown
// DejaVu (installed in the image) covers Unicode; Helvetica is the fallback for local runs.
const FONT = fs.existsSync('/usr/share/fonts/dejavu/DejaVuSans.ttf') ? { r: '/usr/share/fonts/dejavu/DejaVuSans.ttf', b: '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf' } : { r: 'Helvetica', b: 'Helvetica-Bold' };
const tidy = t => String(t).replace(/[\u2010-\u2015\u2212]/g, '-').replace(/[\u00a0\u202f\u2009]/g, ' ').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');

export function makePdf({ title, filename, content }) {
  const id = crypto.randomUUID();
  const name = `${String(filename || title || 'dokumen').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'dokumen'}.pdf`;
  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 60, right: 60 }, info: { Title: title, Author: 'Efrino Wahyu Eko Pambudi' } });
  const out = fs.createWriteStream(`${FILES}/${id}.pdf`);
  doc.pipe(out);
  const inline = (text, opts = {}) => { // **bold** segments
    const parts = String(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    parts.forEach((p, i) => { const b = /^\*\*.*\*\*$/.test(p); doc.font(b ? FONT.b : FONT.r).text(b ? p.slice(2, -2) : p, { ...opts, continued: i < parts.length - 1 }); });
  };
  doc.font(FONT.r);
  const lines = tidy(content).replace(/\r/g, '').split('\n');
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trimEnd();
    if (/^\s*\|.*\|\s*$/.test(line)) { // markdown table block
      const block = [];
      while (li < lines.length && /^\s*\|.*\|\s*$/.test(lines[li])) block.push(lines[li++]);
      li--; drawTable(doc, block.filter(r => !/^\s*\|\s*:?-{2,}/.test(r)).map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim().replace(/\*\*/g, ''))));
      continue;
    }
    if (/^> /.test(line)) { const y = doc.y; doc.font(FONT.r).fontSize(10).fillColor('#444').text(line.slice(2).replace(/\*\*/g, ''), 72, y + 2, { width: 463 }); doc.moveTo(64, y).lineTo(64, doc.y).strokeColor('#b9b0f5').lineWidth(2).stroke().lineWidth(1); doc.x = 60; doc.moveDown(0.4).fontSize(10.5).fillColor('#111'); continue; }
    if (!line.trim()) { doc.moveDown(0.5); continue; }
    if (/^# /.test(line)) { doc.font(FONT.b).fontSize(18).fillColor('#1b1340').text(line.slice(2)); doc.font(FONT.r); doc.moveDown(0.3); doc.fontSize(10.5).fillColor('#111'); continue; }
    if (/^## /.test(line)) { doc.moveDown(0.4).font(FONT.b).fontSize(13).fillColor('#3b2fa0').text(line.slice(3)); doc.moveTo(doc.x, doc.y + 2).lineTo(535, doc.y + 2).strokeColor('#d8d4f5').stroke(); doc.moveDown(0.4); doc.font(FONT.r).fontSize(10.5).fillColor('#111'); continue; }
    if (/^### /.test(line)) { doc.font(FONT.b).fontSize(11.5).text(line.slice(4)); doc.font(FONT.r).fontSize(10.5); continue; }
    if (/^\s*[-*•] /.test(line)) { doc.fontSize(10.5); inline('•  ' + line.replace(/^\s*[-*•] /, ''), { indent: 10, lineGap: 2 }); continue; }
    doc.fontSize(10.5); inline(line, { lineGap: 2, align: 'left' });
  }
  doc.end();
  db.prepare('INSERT INTO files (id, name) VALUES (?, ?)').run(id, name);
  return new Promise((res, rej) => { out.on('finish', () => res({ file_id: id, name, url: `/api/files/${id}` })); out.on('error', rej); });
}
function drawTable(doc, rows) {
  if (!rows.length) return;
  const cols = Math.max(...rows.map(r => r.length)), left = 60, width = 475, cw = width / cols, pad = 4;
  doc.moveDown(0.3);
  rows.forEach((r, ri) => {
    doc.font(ri ? FONT.r : FONT.b).fontSize(9.5);
    const h = Math.max(...Array.from({ length: cols }, (_, c) => doc.heightOfString(r[c] || '', { width: cw - pad * 2 }))) + pad * 2;
    if (doc.y + h > doc.page.height - 56) doc.addPage();
    const y = doc.y;
    if (!ri) doc.rect(left, y, width, h).fill('#efedfb');
    doc.fillColor('#111');
    for (let c = 0; c < cols; c++) { doc.rect(left + c * cw, y, cw, h).strokeColor('#d8d4f5').stroke(); doc.text(r[c] || '', left + c * cw + pad, y + pad, { width: cw - pad * 2 }); }
    doc.x = left; doc.y = y + h;
  });
  doc.moveDown(0.6).font(FONT.r).fontSize(10.5);
}

export const fileInfo = id => db.prepare('SELECT * FROM files WHERE id = ?').get(String(id));
const EXT = id => (fileInfo(id)?.name.match(/\.(docx|pdf)$/i)?.[1] || 'pdf').toLowerCase();
export const filePath = id => `${FILES}/${id}.${EXT(id)}`;
export const fileType = id => EXT(id) === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';

// --- Word (.docx) from the same simple markdown, so recruiters/portals that want Word get an editable file
export async function makeDocx({ title, filename, content }) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } = await import('docx');
  const id = crypto.randomUUID();
  const name = `${String(filename || title || 'dokumen').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'dokumen'}.docx`;
  const runs = (t, o = {}) => String(t).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map(x => /^\*\*.*\*\*$/.test(x) ? new TextRun({ text: x.slice(2, -2), bold: true, ...o }) : new TextRun({ text: x, ...o }));
  const kids = [];
  for (const raw of tidy(content).replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim() || /^\s*\|?\s*:?-{2,}/.test(line)) continue;
    if (/^# /.test(line)) kids.push(new Paragraph({ children: [new TextRun({ text: line.slice(2), bold: true, size: 36, color: '1B1340' })], spacing: { after: 60 } }));
    else if (/^## /.test(line)) kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: line.slice(3), bold: true, size: 26, color: '3B2FA0' })], spacing: { before: 200, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D8D4F5', space: 2 } } }));
    else if (/^### /.test(line)) kids.push(new Paragraph({ children: runs(line.slice(4), { bold: true }), spacing: { before: 80 } }));
    else if (/^\s*[-*•] /.test(line)) kids.push(new Paragraph({ bullet: { level: 0 }, children: runs(line.replace(/^\s*[-*•] /, '')), spacing: { after: 40 } }));
    else kids.push(new Paragraph({ children: runs(line.replace(/^> /, '').replace(/\|/g, ' ')), spacing: { after: 100 } }));
  }
  const doc = new Document({ creator: 'Efrino Wahyu Eko Pambudi', title, styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: kids }] });
  fs.writeFileSync(`${FILES}/${id}.docx`, await Packer.toBuffer(doc));
  db.prepare('INSERT INTO files (id, name) VALUES (?, ?)').run(id, name);
  return { file_id: id, name, url: `/api/files/${id}` };
}

// --- email (staged until confirmed)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const mailConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);
export async function sendMail(p) {
  const t = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.gmail.com', port: Number(process.env.SMTP_PORT || 465), secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  const att = p.attachment_file_id && fileInfo(p.attachment_file_id);
  return t.sendMail({ from: `"${process.env.MAIL_FROM_NAME || 'Efrino Wahyu Eko Pambudi'}" <${process.env.SMTP_USER}>`, to: p.to, subject: p.subject, text: p.body,
    attachments: att ? [{ filename: att.name, path: filePath(att.id) }] : [] });
}

export async function runTool(name, args, ctx) {
  switch (name) {
    case 'search_opportunities': {
      const q = `%${String(args.query || '').slice(0, 60)}%`, track = args.track || 'all', status = args.status || 'all', min = Number(args.min_score ?? 0);
      return db.prepare(`SELECT * FROM items WHERE (title LIKE ? OR company LIKE ? OR description LIKE ?) AND (? = 'all' OR track = ?) AND (? = 'all' OR status = ?) AND coalesce(score, 0) >= ? ORDER BY score DESC LIMIT 10`)
        .all(q, q, q, track, track, status, status, min).map(brief);
    }
    case 'get_opportunity': { const i = db.prepare('SELECT * FROM items WHERE id = ?').get(Number(args.id)); return i ? { ...brief(i), description: String(i.description).slice(0, 3500), draft: i.draft } : { error: 'tidak ditemukan' }; }
    case 'set_status': {
      if (!['new', 'shortlist', 'sent', 'archived'].includes(args.status)) return { error: 'status salah' };
      const r = db.prepare('UPDATE items SET status = ? WHERE id = ?').run(args.status, Number(args.id)); return r.changes ? { ok: true } : { error: 'tidak ditemukan' };
    }
    case 'write_application_draft': { const i = db.prepare('SELECT * FROM items WHERE id = ?').get(Number(args.id)); return i ? { draft: await makeDraft(i, args.lang) } : { error: 'tidak ditemukan' }; }
    case 'generate_pdf': { const f = await makePdf(args); ctx.files.push(f); return { file_id: f.file_id, name: f.name, note: 'PDF siap; tautan unduhan otomatis ditampilkan ke pemilik.' }; }
    case 'send_email': {
      if (!EMAIL.test(String(args.to || ''))) return { error: 'alamat email tidak valid' };
      if (args.attachment_file_id && !fileInfo(args.attachment_file_id)) return { error: 'lampiran tidak ditemukan' };
      const id = crypto.randomUUID();
      const payload = { to: args.to, subject: String(args.subject).slice(0, 200), body: String(args.body).slice(0, 10000), attachment_file_id: args.attachment_file_id || null };
      db.prepare('INSERT INTO actions (id, type, payload) VALUES (?, ?, ?)').run(id, 'email', JSON.stringify(payload));
      ctx.actions.push({ id, type: 'email', ...payload, attachment: payload.attachment_file_id ? fileInfo(payload.attachment_file_id)?.name : null });
      return { staged: true, action_id: id, note: mailConfigured() ? 'Menunggu pemilik menekan "Kirim email".' : 'SMTP belum diatur: email tersimpan sebagai draft; pemilik perlu mengisi SMTP_USER/SMTP_PASS.' };
    }
    case 'save_gmail_draft': {
      if (args.to && !EMAIL.test(String(args.to))) return { error: 'alamat email tidak valid' };
      if (args.attachment_file_id && !fileInfo(args.attachment_file_id)) return { error: 'lampiran tidak ditemukan' };
      const r = await gmailDraft({ to: args.to, subject: String(args.subject).slice(0, 200), body: String(args.body).slice(0, 10000), attachment_file_id: args.attachment_file_id });
      ctx.drafts = (ctx.drafts || 0) + 1; return { ...r, note: 'Draf tersimpan di Gmail pemilik.' };
    }
    case 'notify_me': {
      const ch = args.channel || 'both', sent = [];
      if (ch !== 'telegram') { try { const { waSend, waStatus } = await import('./wa.js'); if (waStatus().status === 'connected') { await waSend(String(args.text).slice(0, 3000)); sent.push('whatsapp'); } } catch {} }
      if (ch !== 'whatsapp' && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: String(args.text).slice(0, 3500) }) });
        if (r.ok) sent.push('telegram');
      }
      return sent.length ? { sent } : { error: 'tidak ada kanal aktif' };
    }
    default: return { error: `tool ${name} tidak dikenal` };
  }
}

// --- Gmail draft via IMAP (same App Password as SMTP). A draft stays in the owner's mailbox; nothing is sent.
export async function gmailDraft({ to = '', subject = '', body = '', attachment_file_id = null }) {
  if (!mailConfigured()) throw new Error('Gmail belum terhubung (SMTP_USER & SMTP_PASS).');
  const att = attachment_file_id && fileInfo(attachment_file_id);
  const raw = await new MailComposer({ from: `"${process.env.MAIL_FROM_NAME || 'Efrino Wahyu Eko Pambudi'}" <${process.env.SMTP_USER}>`, to: to || undefined, subject, text: body,
    attachments: att ? [{ filename: att.name, path: filePath(att.id) }] : [] }).compile().build();
  const c = new ImapFlow({ host: process.env.IMAP_HOST || 'imap.gmail.com', port: 993, secure: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, logger: false });
  await c.connect();
  try {
    // The Drafts folder name is localised ("[Gmail]/Draf", "[Gmail]/Drafts"): find it by its special-use flag.
    const box = (await c.list()).find(b => b.specialUse === '\\Drafts')?.path || '[Gmail]/Drafts';
    await c.append(box, raw, ['\\Draft', '\\Seen']);
    return { ok: true, folder: box };
  } finally { await c.logout().catch(() => {}); }
}

// Owner clicked "Kirim": the only path by which email leaves the server.
export async function confirmAction(id) {
  const a = db.prepare('SELECT * FROM actions WHERE id = ?').get(String(id));
  if (!a) throw new Error('Aksi tidak ditemukan.');
  if (a.status !== 'pending') throw new Error(`Aksi sudah ${a.status}.`);
  if (a.type === 'email') {
    if (!mailConfigured()) throw new Error('SMTP belum diatur (SMTP_USER & SMTP_PASS di Coolify).');
    const info = await sendMail(JSON.parse(a.payload));
    db.prepare(`UPDATE actions SET status = 'done', result = ? WHERE id = ?`).run(String(info.messageId || 'sent'), a.id);
    return { ok: true };
  }
  throw new Error('Jenis aksi tidak dikenal.');
}
export async function actionToDraft(id) {
  const a = db.prepare('SELECT * FROM actions WHERE id = ?').get(String(id));
  if (!a) throw new Error('Aksi tidak ditemukan.');
  if (a.status !== 'pending') throw new Error(`Aksi sudah ${a.status}.`);
  await gmailDraft(JSON.parse(a.payload));
  db.prepare(`UPDATE actions SET status = 'drafted' WHERE id = ?`).run(a.id);
  return { ok: true };
}
export const cancelAction = id => db.prepare(`UPDATE actions SET status = 'cancelled' WHERE id = ? AND status = 'pending'`).run(String(id)).changes > 0;
