// Personal AI assistant grounded in Radar's data (profile, opportunities, follow-ups, leads).
import { db } from './db.js';
import { chatRaw, profile } from './engine.js';
import { TOOL_DEFS, runTool, mailConfigured } from './tools.js';

db.exec(`CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY, role TEXT NOT NULL, content TEXT NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')));`);
try { db.exec('ALTER TABLE chat ADD COLUMN meta TEXT'); } catch {} // files/actions shown under a reply

function context() {
  const p = profile();
  const line = i => `#${i.id} [${i.score ?? '?'}] ${i.track === 'business' ? 'Bisnis' : 'Karier'} · ${i.title} · ${i.company || '-'} · ${i.location || '-'}${i.salary ? ' · ' + i.salary : ''}${i.summary ? ` — ${String(i.summary).slice(0, 140)}` : ''}`;
  const top = db.prepare(`SELECT * FROM items WHERE status = 'new' AND score >= ? ORDER BY score DESC LIMIT 8`).all(p.minScore);
  const shortlist = db.prepare(`SELECT * FROM items WHERE status = 'shortlist' ORDER BY score DESC LIMIT 8`).all();
  // fetched_at doubles as "last touched"; good enough for follow-up nudges.
  const sent = db.prepare(`SELECT *, CAST(julianday('now') - julianday(fetched_at) AS INT) AS days FROM items WHERE status = 'sent' ORDER BY id DESC LIMIT 8`).all();
  const leads = db.prepare(`SELECT * FROM items WHERE source = 'jasa' ORDER BY id DESC LIMIT 5`).all();
  const wib = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'short' }).format(new Date());
  return `Hari ini: ${wib} WIB.
Kamu asisten pribadi Efrino untuk karier & bisnisnya (portofolio efrino.web.id, Opnamo, Balasin, jasa Excel→Web, tools). Jawab dalam Bahasa Indonesia kecuali diminta lain, langsung ke inti, praktis, pakai daftar bila membantu. Rujuk peluang dengan #id. Jangan mengarang fakta tentang Efrino di luar PROFIL; jika data kurang, katakan dan sarankan apa yang perlu dicek. Untuk harga proyek, beri rentang + asumsi. ATURAN FAKTA (penting): tentang Efrino, pakai HANYA yang tertulis di PROFIL. Jangan menambah teknologi, angka, atau proyek yang tidak tertulis (mis. Redis, microservice, jumlah user). Bila memberi saran yang belum dilakukan, tandai jelas sebagai "Saran:".
TOOLS: kamu bisa mencari & membuka peluang, mengubah status, membuat draft lamaran, membuat PDF, menyiapkan email (email ke orang lain SELALU menunggu konfirmasi tombol dari Efrino, jadi katakan "sudah saya siapkan, tinggal klik Kirim"), menyimpan draf langsung ke Gmail Efrino (save_gmail_draft: tidak terkirim, aman dipakai kapan saja bila diminta "simpan ke Gmail/draf"), dan mengirim pengingat ke WhatsApp/Telegram Efrino sendiri. Gunakan tool bila diminta atau jelas membantu; jangan mengaku sudah melakukan sesuatu tanpa memanggil tool. Email: ${mailConfigured() ? 'aktif' : 'SMTP belum diatur (email hanya tersimpan sebagai draft)'}.
Hindari tabel lebar; pakai daftar bernomor/berpoin.

PROFIL:
${p.about}

FAKTA BISNIS EFRINO (satu-satunya sumber harga; jangan membuat paket/harga lain):
- Jasa Excel → Web (jasa.efrino.web.id): Kilat mulai Rp7,5 jt (1 modul: form+tabel+dashboard, login 2 peran, impor Excel, ±2 minggu, garansi bug 1 bulan); Bisnis Rp15–35 jt (3–6 modul, approval, notifikasi, audit log, otomatisasi rumus, ±4–6 minggu, garansi 3 bulan); Industri mulai Rp50 jt (PPIC/MRP/gudang, integrasi SAP/ERP & handheld, real-time/offline, pendampingan, SLA). Maintenance & hosting mulai Rp750 rb/bulan. Proses: konsultasi gratis → proposal harga tetap → demo mingguan → go-live & pelatihan.
- Opnamo (stok opname SaaS): Starter Rp199 rb/bulan, Bisnis Rp499 rb/bulan, Enterprise custom. Trial 14 hari.
- Balasin (bot WhatsApp AI): Mulai Rp99 rb/bulan, Usaha Rp249 rb/bulan, Bisnis custom. Trial 14 hari.
- Kontak: WhatsApp 0851-8408-4989 · efrinowep@gmail.com · efrino.web.id
DOKUMEN UNTUK PIHAK LUAR (PDF, email, proposal): jangan sebut nama perusahaan tempat Efrino bekerja maupun nama proyek internalnya; tulis "sistem perencanaan produksi di perusahaan manufaktur otomotif". Jangan cantumkan ID internal Radar (#123) atau skor. Jangan menulis tautan file sendiri: tombol unduh muncul otomatis.
YANG DICARI: ${p.wants}

PELUANG TERBAIK (belum diproses):
${top.map(line).join('\n') || '(kosong)'}

SHORTLIST:
${shortlist.map(line).join('\n') || '(kosong)'}

SUDAH DIKIRIM (umur hari sejak tercatat):
${sent.map(i => `${line(i)} · ${i.days} hari`).join('\n') || '(belum ada)'}

LEADS JASA TERBARU:
${leads.map(i => `#${i.id} ${i.description}`).join('\n') || '(belum ada)'}`;
}

export function history(limit = 40) {
  return db.prepare('SELECT role, content, meta, at FROM (SELECT * FROM chat ORDER BY id DESC LIMIT ?) ORDER BY id').all(limit)
    .map(m => {
      const meta = m.meta ? JSON.parse(m.meta) : null;
      // Reflect what happened to staged emails since (sent / cancelled).
      meta?.actions?.forEach(a => { a.status = db.prepare('SELECT status FROM actions WHERE id = ?').get(a.id)?.status || 'pending'; });
      return { ...m, meta };
    });
}

export async function ask(message) {
  const msg = String(message || '').trim().slice(0, 4000);
  if (!msg) throw new Error('Pesan kosong.');
  const ids = [...msg.matchAll(/#(\d+)/g)].map(m => Number(m[1])).slice(0, 3);
  const detail = ids.map(id => db.prepare('SELECT id, title, company, location, url, description, draft FROM items WHERE id = ?').get(id)).filter(Boolean)
    .map(i => `DETAIL #${i.id}: ${i.title} · ${i.company} · ${i.location} · ${i.url}\n${String(i.description).slice(0, 3000)}${i.draft ? `\nDRAFT TERSIMPAN:\n${i.draft}` : ''}`).join('\n\n');
  const messages = [{ role: 'system', content: context() + (detail ? `\n\n${detail}` : '') }, ...history(8).map(m => ({ role: m.role, content: String(m.content).slice(0, 2500) + (m.meta?.files?.length ? `\n[File dibuat: ${m.meta.files.map(f => `${f.name} (file_id ${f.file_id})`).join(', ')}]` : '') })), { role: 'user', content: msg }];
  const ctx = { files: [], actions: [], used: [] };
  let reply = '';
  // Tool loop: the model may call tools up to 5 rounds before answering.
  for (let step = 0; step < 6; step++) {
    const out = await chatRaw({ messages, tools: TOOL_DEFS, tool_choice: step < 5 ? 'auto' : 'none' });
    const calls = out.tool_calls || [];
    if (!calls.length) { reply = (out.content || '').trim(); break; }
    messages.push({ role: 'assistant', content: out.content || '', tool_calls: calls });
    for (const c of calls) {
      let args = {}; try { args = JSON.parse(c.function.arguments || '{}'); } catch {}
      let result; try { result = await runTool(c.function.name, args, ctx); } catch (e) { result = { error: e.message }; }
      ctx.used.push(c.function.name);
      messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(result).slice(0, 6000) });
    }
  }
  // Models sometimes invent file links ("sandbox:/files/..."); the real download buttons come from meta.
  reply = reply.replace(/\[([^\]]+)\]\((?:sandbox:|\/files\/|\/api\/files\/)[^)]*\)/g, '$1');
  if (!reply) reply = ctx.used.length ? 'Selesai.' : 'Maaf, saya belum bisa menjawab. Coba ulangi.';
  const meta = ctx.files.length || ctx.actions.length || ctx.used.length ? { files: ctx.files, actions: ctx.actions, used: [...new Set(ctx.used)] } : null;
  const ins = db.prepare('INSERT INTO chat (role, content, meta) VALUES (?, ?, ?)');
  ins.run('user', msg, null); ins.run('assistant', reply, meta ? JSON.stringify(meta) : null);
  return { reply, meta };
}

export const reset = () => db.exec('DELETE FROM chat');
