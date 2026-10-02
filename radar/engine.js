import fs from 'node:fs';
import { db, getSetting, setSetting } from './db.js';
import { SOURCES } from './sources.js';

export const DEFAULT_PROFILE = {
  about: fs.existsSync('/app/profile.txt') ? fs.readFileSync('/app/profile.txt', 'utf8') : '',
  include: 'javascript, typescript, node, vue, react, php, laravel, codeigniter, flutter, dart, python, fastapi, full stack, fullstack, backend, mobile, erp, inventory, warehouse, manufacturing, supply chain, logistics, mysql, postgres',
  exclude: 'senior staff, principal, 10+ years, clearance, us citizens only, onsite only',
  minScore: 60,
  wants: 'Remote atau Jabodetabek. Gaji/proyek lebih baik dari posisi sekarang. Terbuka untuk full-time remote internasional dan proyek freelance digitalisasi industri.',
};
export const profile = () => ({ ...DEFAULT_PROFILE, ...getSetting('profile', {}) });

const words = s => s.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
export function prefilter(it, p = profile()) {
  const text = `${it.title} ${it.tags} ${it.description}`.toLowerCase();
  return words(p.include).some(w => text.includes(w)) && !words(p.exclude).some(w => text.includes(w));
}

// --- LLM (Groq -> Gemini), JSON mode
const PROVIDERS = [
  { key: process.env.GROQ_API_KEY, model: 'openai/gpt-oss-120b', url: 'https://api.groq.com/openai/v1/chat/completions', extra: { reasoning_effort: 'low' } },
  { key: process.env.GEMINI_API_KEY, model: 'gemini-2.5-flash', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' },
].filter(p => p.key);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Scoring uses the small model: its own Groq quota, so Radar never starves Balasin's customer bots.
export async function llm(messages, json = true, { small = false } = {}) {
  if (globalThis.__radarFakeLLM) return globalThis.__radarFakeLLM(messages);
  let err;
  for (const base of PROVIDERS) {
    const p = small && base.url.includes('groq') ? { ...base, model: process.env.RADAR_SCORE_MODEL || 'openai/gpt-oss-20b' } : base;
    for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(p.url, { method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
        body: JSON.stringify({ model: p.model, messages, temperature: 0.3, max_tokens: 1200, ...(json ? { response_format: { type: 'json_object' } } : {}), ...p.extra }) });
        if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
      const t = (await r.json()).choices[0].message.content;
      return json ? JSON.parse(t.replace(/^```(?:json)?\s*|\s*```$/g, '')) : t;
    } catch (e) {
      err = e; console.error('[llm]', p.model, e.message.slice(0, 120));
      if (/^429/.test(e.message) && attempt === 0) { await sleep(20000); continue; } // tokens-per-minute window
      break;
    }
    }
  }
  throw err || new Error('AI belum dikonfigurasi');
}

// Deterministic location check: small models routinely ignore "Remote (US)".
const OPEN = /\b(worldwide|anywhere|global(ly)?|international|apac|asia|south ?east asia|sea|indonesia|jakarta|bekasi|gmt\+7|utc\+7|wib)\b/i;
const RESTRICTED = /(remote\s*[(\[-]\s*(us|usa|u\.s\.?|united states|canada|us\s*\/\s*can(ada)?|north america|uk|eu|europe|emea|germany|latam)\b)|\b(us|usa|u\.s\.|canada|uk|eu|europe|germany)[ -]only\b|\bmust (be|reside|live)( based| located)? in (the )?(us|usa|united states|canada|uk|eu|europe|germany)\b|\bus citizens?\b|\bsecurity clearance\b|\bonsite\b(?![^|]{0,30}\bor remote\b(?!\s*\((us|can)))/i;
export function locationGate(it) {
  const text = `${it.location} ${it.title} ${String(it.description).slice(0, 1500)}`;
  if (OPEN.test(text)) return null;
  const m = text.match(RESTRICTED);
  return m ? `Lokasi terbatas (“${m[0].trim().slice(0, 40)}”), kemungkinan tidak menerima kandidat dari Indonesia` : null;
}

export async function score(it) {
  const p = profile();
  const out = await llm([{ role: 'system', content: `Kamu konsultan karier & bisnis untuk kandidat berikut. Nilai kecocokan sebuah peluang untuknya.
PROFIL:\n${p.about}\nYANG DICARI: ${p.wants}
Balas JSON: {"score": 0-100, "track": "career" (lowongan kerja) atau "business" (proyek/klien/kontrak freelance), "summary": "1-2 kalimat Bahasa Indonesia", "why": ["alasan cocok"], "concerns": ["risiko/kekurangan, mis. syarat lokasi, senioritas, bahasa"]}
RUBRIK (jumlahkan, maks 100): skill inti cocok 0-40 · lokasi/remote bisa dari Indonesia 0-30 (0 bila hanya US/EU/negara tertentu) · senioritas sesuai 0-15 · info jelas (gaji/tanggung jawab) 0-15.
Jangan pernah mengklaim pengalaman, sertifikat, atau proyek yang tidak tertulis di PROFIL. Jika ragu soal lokasi, masukkan ke concerns.` },
  { role: 'user', content: `Judul: ${it.title}\nPerusahaan: ${it.company}\nLokasi: ${it.location}\nGaji: ${it.salary || '-'}\nTag: ${it.tags}\n\n${it.description.slice(0, 2200)}` }], true, { small: true });
  let s = Math.max(0, Math.min(100, Math.round(Number(out.score) || 0)));
  const gate = locationGate(it);
  if (gate) { s = Math.min(s, 30); out.concerns = [gate, ...(Array.isArray(out.concerns) ? out.concerns : [])]; }
  db.prepare(`UPDATE items SET score = ?, track = ?, summary = ?, why = ?, concerns = ?, scored_at = datetime('now') WHERE id = ?`)
    .run(s, out.track === 'business' ? 'business' : 'career', String(out.summary || '').slice(0, 600), JSON.stringify(out.why || []).slice(0, 2000), JSON.stringify(out.concerns || []).slice(0, 2000), it.id);
  return s;
}

export async function draft(it, lang) {
  const p = profile();
  const english = lang ? lang === 'en' : !/indonesia|jakarta|bekasi|rupiah|\bdan\b|\byang\b/i.test(`${it.location} ${it.description.slice(0, 600)}`);
  const kind = it.track === 'business' ? (english ? 'a short project proposal' : 'proposal proyek singkat') : (english ? 'a concise cover letter' : 'surat lamaran singkat');
  const text = await llm([{ role: 'system', content: `Write ${kind} in ${english ? 'English' : 'Bahasa Indonesia'} for the candidate below. 150-220 words. Specific, no clichés, no invented facts: only use the profile. Mention 2-3 concrete achievements that match the posting. End with a clear call to action. Plain text, no placeholders except [Name] if the recipient is unknown.\n\nPROFILE:\n${p.about}` },
    { role: 'user', content: `Posting: ${it.title} at ${it.company} (${it.location})\n\n${it.description.slice(0, 3500)}` }], false);
  db.prepare('UPDATE items SET draft = ? WHERE id = ?').run(text.trim(), it.id);
  return text.trim();
}

const insert = db.prepare(`INSERT OR IGNORE INTO items (source, ext_id, title, company, url, location, salary, tags, description, posted_at, status)
  VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
export function addItem(source, it, status = 'new') {
  return insert.run(source, it.ext_id, it.title, it.company || '', it.url || '', it.location || '', it.salary || '', it.tags || '', it.description || '', it.posted_at || null, status).changes;
}

// Fetch every source, keep only pre-filtered items, then score a capped batch.
export async function runAll({ scoreLimit = Number(process.env.SCORE_PER_RUN || 40) } = {}) {
  const p = profile();
  for (const [name, fn] of Object.entries(SOURCES)) {
    try {
      const list = await fn();
      let added = 0;
      for (const it of list) if (it.ext_id && prefilter(it, p)) added += addItem(name, it);
      db.prepare('INSERT INTO runs (source, fetched, added) VALUES (?,?,?)').run(name, list.length, added);
    } catch (e) { db.prepare('INSERT INTO runs (source, error) VALUES (?,?)').run(name, e.message.slice(0, 300)); console.error('[src]', name, e.message); }
  }
  importLeads();
  const todo = db.prepare(`SELECT * FROM items WHERE score IS NULL AND status = 'new' ORDER BY id DESC LIMIT ?`).all(scoreLimit);
  let scored = 0;
  for (const it of todo) { try { await score(it); scored++; await sleep(2500); } catch { break; } }
  setSetting('lastRun', new Date().toISOString());
  return { scored };
}

// Inbound consultation leads from jasa.efrino.web.id are the best business opportunities.
export function importLeads(file = process.env.LEADS_FILE || '/leads/leads.jsonl') {
  if (!fs.existsSync(file)) return 0;
  let n = 0;
  for (const line of fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
    const l = JSON.parse(line);
    n += addItem('jasa', { ext_id: l.at, title: `Konsultasi: ${l.company || l.name}`, company: l.company || l.name, url: l.whatsapp ? `https://wa.me/${l.whatsapp.replace(/^0/, '62').replace(/^\+/, '')}` : (l.email ? `mailto:${l.email}` : ''),
      location: 'Lead masuk', salary: l.budget || '', tags: `lead, ${l.source || ''}`, description: `${l.name} (${l.company || '-'}): ${l.need}`, posted_at: l.at });
  }
  db.prepare(`UPDATE items SET track = 'business', score = 100, summary = 'Lead masuk dari form jasa: hubungi dalam 1×24 jam.' WHERE source = 'jasa' AND score IS NULL`).run();
  return n;
}

export async function addManual(text, url = '') {
  const first = text.trim().split('\n')[0].slice(0, 160);
  const id = `m-${Date.now()}`;
  addItem('manual', { ext_id: id, title: first, company: '', url, location: '', tags: 'manual', description: text.slice(0, 5000), posted_at: new Date().toISOString() }, 'shortlist');
  const it = db.prepare('SELECT * FROM items WHERE source = ? AND ext_id = ?').get('manual', id);
  await score(it);
  return db.prepare('SELECT * FROM items WHERE id = ?').get(it.id);
}

// Daily digest to Telegram (official API) and/or WhatsApp (Baileys sender). Returns channels that succeeded.
export async function digest({ force = false } = {}) {
  const p = profile();
  const top = db.prepare(`SELECT * FROM items WHERE status = 'new' AND score >= ? AND (? OR fetched_at > datetime('now', '-1 day')) ORDER BY score DESC LIMIT 8`).all(p.minScore, force ? 1 : 0);
  if (!top.length) return [];
  const body = top.map(i => `${i.score} · ${i.track === 'business' ? '💼' : '🧑‍💻'} ${i.title} (${i.company})\n${i.url}`).join('\n\n');
  const text = `🎯 Radar: ${top.length} peluang ${force ? 'teratas' : 'baru'}\n\n${body}\n\nBuka: https://radar.efrino.web.id`;
  const sent = [];
  if (await telegram(text)) sent.push('telegram');
  try { const { waSend, waStatus } = await import('./wa.js'); if (waStatus().status === 'connected') { await waSend(text); sent.push('whatsapp'); } } catch (e) { console.error('[wa] digest', e.message); }
  return sent;
}

async function telegram(text) {
  const { TELEGRAM_BOT_TOKEN: tok, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!tok || !chat) return false;
  const r = await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }) });
  if (!r.ok) { console.error('[telegram]', r.status, (await r.text()).slice(0, 200)); return false; }
  return true;
}
