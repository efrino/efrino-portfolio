import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, getSetting, setSetting } from './db.js';
import { runAll, score, draft, addManual, addShared, completeItem, extractFromImages, digest, profile, importLeads } from './engine.js';
import { waStart, waStatus, waLogout, waSend, waBoot } from './wa.js';
import { ask, history, reset } from './assistant.js';
import { fileInfo, filePath, confirmAction, cancelAction, actionToDraft, gmailDraft } from './tools.js';

const PASSWORD = process.env.RADAR_PASSWORD || '';
// Long random token for the iOS Shortcut (sent as a Bearer header); stored once, shown in the dashboard.
const shareToken = () => { let t = getSetting('shareToken', null); if (!t) { t = crypto.randomBytes(24).toString('base64url'); setSetting('shareToken', t); } return t; };
const bearerOk = req => { const h = String(req.headers.authorization || ''); const t = shareToken(); return h.length === t.length + 7 && crypto.timingSafeEqual(Buffer.from(h), Buffer.from('Bearer ' + t)); };
const SECRET = crypto.createHash('sha256').update('radar:' + PASSWORD).digest();
const PUBLIC = path.join(import.meta.dirname, 'public');
const sign = v => `${v}.${crypto.createHmac('sha256', SECRET).update(v).digest('base64url')}`;
const verify = c => { if (!c) return false; const [v, s] = c.split('.'); const ok = sign(v); return ok.length === c.length && crypto.timingSafeEqual(Buffer.from(ok), Buffer.from(c)) && Number(v) > Date.now(); };
const cookieOf = req => (req.headers.cookie || '').match(/(?:^|; )radar=([^;]+)/)?.[1];
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const body = async (req, max = 100000) => { let s = ''; for await (const c of req) { s += c; if (s.length > max) throw new Error('Data terlalu besar.'); } return s ? JSON.parse(s) : {}; };
const fails = new Map();
const parse = it => it && ({ ...it, why: JSON.parse(it.why || '[]'), concerns: JSON.parse(it.concerns || '[]') });

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:");
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/healthz') return json(res, 200, { ok: true });
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress;
      const f = (fails.get(ip) || []).filter(t => Date.now() - t < 15 * 60e3);
      if (f.length >= 8) return json(res, 429, { error: 'Terlalu banyak percobaan. Tunggu 15 menit.' });
      const { password } = await body(req);
      const ok = PASSWORD && typeof password === 'string' && password.length === PASSWORD.length && crypto.timingSafeEqual(Buffer.from(password), Buffer.from(PASSWORD));
      if (!ok) { f.push(Date.now()); fails.set(ip, f); return json(res, 401, { error: 'Password salah.' }); }
      res.setHeader('Set-Cookie', `radar=${sign(String(Date.now() + 30 * 86400e3))}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 86400}`);
      return json(res, 200, { ok: true });
    }
    // Share endpoint: the iOS Shortcut authenticates with the share token (no cookie on Shortcuts).
    if (url.pathname === '/api/share' && req.method === 'POST' && bearerOk(req)) {
      try { const it = await addShared(await body(req)); return json(res, 201, { ok: true, id: it.id, title: it.title, score: it.score, duplicate: !!it.duplicate, message: it.duplicate ? `Sudah ada di Radar: ${it.title}` : it.score !== null ? `Tersimpan, skor ${it.score}: ${it.title}` : `Tersimpan di Shortlist. Lengkapi deskripsinya untuk dinilai.` }); }
      catch (e) { return json(res, 400, { error: e.message }); }
    }
    // Android Web Share Target lands here (GET) -> open the app with the share prefilled.
    if (url.pathname === '/share') { res.writeHead(302, { Location: `/?share=${encodeURIComponent(JSON.stringify({ url: url.searchParams.get('url') || '', title: url.searchParams.get('title') || '', text: url.searchParams.get('text') || '' }))}` }); return res.end(); }
    if (url.pathname.startsWith('/api/')) {
      if (!verify(cookieOf(req))) return json(res, 401, { error: 'Login dulu.' });
      if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'radar') return json(res, 403, { error: 'Ditolak.' });
      const p = url.pathname.slice(5);
      if (p === 'items') {
        const track = url.searchParams.get('track') || 'career', status = url.searchParams.get('status') || 'new', min = Number(url.searchParams.get('min') ?? profile().minScore);
        const rows = db.prepare(`SELECT id, source, title, company, url, location, salary, tags, posted_at, fetched_at, track, score, summary, why, concerns, draft IS NOT NULL AS has_draft, status
          FROM items WHERE status = ? AND (? = 'all' OR track = ?) AND (score >= ? OR (? = 'shortlist' OR ? = 'sent')) ORDER BY score DESC, id DESC LIMIT 200`).all(status, track, track, min, status, status);
        return json(res, 200, rows.map(parse));
      }
      if (p === 'stats') {
        const c = q => db.prepare(q).get().n;
        return json(res, 200, { total: c(`SELECT count(*) n FROM items`), unscored: c(`SELECT count(*) n FROM items WHERE score IS NULL`), good: c(`SELECT count(*) n FROM items WHERE status='new' AND score >= ${profile().minScore}`),
          shortlist: c(`SELECT count(*) n FROM items WHERE status='shortlist'`), sent: c(`SELECT count(*) n FROM items WHERE status='sent'`), lastRun: getSetting('lastRun', null),
          runs: db.prepare('SELECT at, source, fetched, added, error FROM runs ORDER BY id DESC LIMIT 7').all() });
      }
      if (p === 'profile' && req.method === 'GET') return json(res, 200, profile());
      if (p === 'share' && req.method === 'POST') { try { return json(res, 201, parse(await addShared(await body(req)))); } catch (e) { return json(res, 400, { error: e.message }); } }
      if (p === 'extract' && req.method === 'POST') { try { const b = await body(req, 16e6); return json(res, 200, { text: await extractFromImages(b.images) }); } catch (e) { return json(res, 400, { error: e.message }); } }
      if (p === 'share-token' && req.method === 'GET') return json(res, 200, { token: shareToken(), endpoint: `https://${req.headers.host}/api/share` });
      if (p === 'share-token' && req.method === 'POST') { setSetting('shareToken', null); db.prepare("DELETE FROM settings WHERE key = 'shareToken'").run(); return json(res, 200, { token: shareToken() }); }
      if (p === 'profile' && req.method === 'PUT') { const b = await body(req); setSetting('profile', { about: String(b.about || '').slice(0, 8000), include: String(b.include || ''), exclude: String(b.exclude || ''), wants: String(b.wants || '').slice(0, 1000), minScore: Math.max(0, Math.min(100, Number(b.minScore) || 60)) }); return json(res, 200, { ok: true }); }
      if (p === 'digest' && req.method === 'POST') { const sent = await digest({ force: true }); return json(res, sent.length ? 200 : 400, sent.length ? { sent } : { error: 'Belum ada kanal aktif (Telegram/WhatsApp) atau belum ada peluang.' }); }
      if (p === 'assistant' && req.method === 'GET') return json(res, 200, history());
      if (p === 'assistant' && req.method === 'POST') { const b = await body(req); try { return json(res, 200, await ask(b.message)); } catch (e) { return json(res, 502, { error: e.message.startsWith('4') || e.message.startsWith('5') ? 'AI sedang sibuk/limit. Coba lagi sebentar.' : e.message }); } }
      const fm = p.match(/^files\/([0-9a-f-]{36})$/);
      if (fm && req.method === 'GET') { const f = fileInfo(fm[1]); if (!f) return json(res, 404, { error: 'File tidak ada.' });
        res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="${f.name.replace(/"/g, '')}"` }); return fs.createReadStream(filePath(f.id)).pipe(res); }
      const am = p.match(/^actions\/([0-9a-f-]{36})\/(confirm|cancel|draft)$/);
      if (am && req.method === 'POST') { try { if (am[2] === 'confirm') return json(res, 200, await confirmAction(am[1])); if (am[2] === 'draft') return json(res, 200, await actionToDraft(am[1])); return json(res, 200, { ok: cancelAction(am[1]) }); } catch (e) { return json(res, 409, { error: e.message }); } }
      if (p === 'assistant' && req.method === 'DELETE') { reset(); return json(res, 200, { ok: true }); }
      if (p === 'wa' && req.method === 'GET') return json(res, 200, waStatus());
      if (p === 'wa/connect' && req.method === 'POST') { const b = await body(req); return json(res, 200, await waStart({ pairing: !!b.pairing })); }
      if (p === 'wa/logout' && req.method === 'POST') { await waLogout(); return json(res, 200, { ok: true }); }
      if (p === 'wa/test' && req.method === 'POST') { try { await waSend('✅ Tes dari Radar: laporan peluang harian akan dikirim ke nomor ini.'); return json(res, 200, { ok: true }); } catch (e) { return json(res, 409, { error: e.message }); } }
      if (p === 'run' && req.method === 'POST') { runAll().then(r => console.log('[run] manual', r)).catch(e => console.error(e)); return json(res, 202, { ok: true }); }
      if (p === 'manual' && req.method === 'POST') { const b = await body(req); if (String(b.text || '').trim().length < 40) return json(res, 400, { error: 'Tempel teks lowongan/proyek (min. 40 karakter).' }); return json(res, 201, parse(await addManual(String(b.text), String(b.url || '')))); }
      const m = p.match(/^items\/(\d+)(?:\/(draft|status|rescore|complete|gmail))?$/);
      if (m) {
        const it = db.prepare('SELECT * FROM items WHERE id = ?').get(Number(m[1]));
        if (!it) return json(res, 404, { error: 'Tidak ditemukan.' });
        if (!m[2]) return json(res, 200, parse(it));
        if (m[2] === 'draft') { const b = await body(req); if (b.text !== undefined) { db.prepare('UPDATE items SET draft = ? WHERE id = ?').run(String(b.text).slice(0, 8000), it.id); return json(res, 200, { draft: b.text }); } return json(res, 200, { draft: await draft(it, b.lang) }); }
        if (m[2] === 'status') { const b = await body(req); if (!['new', 'shortlist', 'sent', 'archived'].includes(b.status)) return json(res, 400, { error: 'Status salah.' }); db.prepare('UPDATE items SET status = ? WHERE id = ?').run(b.status, it.id); return json(res, 200, { ok: true }); }
        if (m[2] === 'gmail') { const b = await body(req); const text = String(b.text || it.draft || '').trim(); if (!text) return json(res, 400, { error: 'Belum ada draft.' });
          const subject = String(b.subject || (it.track === 'business' ? `Proposal: ${it.title}` : `Application: ${it.title}`)).slice(0, 200);
          try { const r = await gmailDraft({ to: b.to, subject, body: text }); return json(res, 200, r); } catch (e) { return json(res, 409, { error: e.message }); } }
        if (m[2] === 'complete') { const b = await body(req); try { return json(res, 200, parse(await completeItem(it.id, b.text))); } catch (e) { return json(res, 400, { error: e.message }); } }
        if (m[2] === 'rescore') { await score(it); return json(res, 200, parse(db.prepare('SELECT * FROM items WHERE id = ?').get(it.id))); }
      }
      return json(res, 404, { error: 'Tidak ada.' });
    }
    // static
    let f = url.pathname === '/' ? '/index.html' : url.pathname;
    const fp = path.normalize(path.join(PUBLIC, f));
    if (!fp.startsWith(PUBLIC) || !fs.existsSync(fp)) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(fp)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(fp).pipe(res);
  } catch (e) { console.error(e); if (!res.headersSent) json(res, 500, { error: e.message.slice(0, 200) }); }
});

if (!PASSWORD) console.warn('[radar] RADAR_PASSWORD is empty: login disabled');
server.listen(Number(process.env.PORT) || 3000, () => console.log('radar listening'));
waBoot();
// Poll politely: every 6 hours, first run shortly after boot. Telegram digest at ~07:00 WIB.
const HOURS = Number(process.env.RUN_EVERY_HOURS || 6);
if (process.env.RUN_ON_BOOT !== '0') setTimeout(() => runAll().then(r => console.log('[run]', r)).catch(e => console.error(e)), 20000);
setInterval(() => runAll().then(r => console.log('[run]', r)).catch(e => console.error(e)), HOURS * 3600e3);
setInterval(() => { const h = new Date(Date.now() + 7 * 3600e3); if (h.getUTCHours() === 7 && h.getUTCMinutes() < 10 && getSetting('digestDay') !== h.toISOString().slice(0, 10)) { setSetting('digestDay', h.toISOString().slice(0, 10)); digest().catch(console.error); } }, 5 * 60e3);
setInterval(() => importLeads(), 10 * 60e3);
