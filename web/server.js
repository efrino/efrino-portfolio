// Zero-dependency server: static files, subdomain routing, and a rate-limited AI chat proxy (Groq / Gemini free tiers).
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;
// AI runs on free-tier hosted APIs (never on this VPS). Providers are tried in order.
const PROVIDERS = [
  { name: 'groq', key: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b', url: 'https://api.groq.com/openai/v1/chat/completions', extra: { reasoning_effort: 'low' } },
  { name: 'gemini', key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-3.5-flash', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' },
].filter(p => p.key);
const DOMAIN = process.env.DOMAIN || 'efrino.web.id';
const PUBLIC = path.join(__dirname, 'public');
const TOOLS = path.join(PUBLIC, 'tools');
// Subdomains served from their own folder, falling back to shared assets.
const SITES = { tools: TOOLS, jasa: path.join(PUBLIC, 'jasa') };
const crypto = require('crypto');
const DATA_DIR = process.env.DATA_DIR || '/data';
const LEADS_FILE = path.join(DATA_DIR, 'leads.jsonl');
const LEADS_TOKEN = process.env.LEADS_TOKEN || '';

// Subdomains that point to projects hosted elsewhere.
const REDIRECTS = {
  shop: 'https://nayea-omega.vercel.app',
  admin: 'https://admin-asto.vercel.app',
  notes: 'https://notes-app-ochre-three.vercel.app',
  api: 'https://hapi-api-three.vercel.app',
  story: 'https://intermediate-dicoding.vercel.app',
  github: 'https://github.com/efrino',
  linkedin: 'https://www.linkedin.com/in/efrinowep/',
  www: `https://${DOMAIN}`,
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml',
};

const PROFILE = fs.readFileSync(path.join(__dirname, 'profile.txt'), 'utf8');
const SYSTEM_PROMPTS = {
  recruiter: `You are "Efrino AI", the portfolio assistant for Efrino Wahyu Eko Pambudi. Answer recruiters' questions about him using ONLY the facts below. Be concise, warm and professional. Reply in the user's language (Indonesian or English). If a fact is not listed, say you don't know and suggest emailing efrinowep@gmail.com. Never invent employers, dates or numbers.\n\n${PROFILE}`,
  code: 'You are a senior software engineer. Explain or review the given code clearly and briefly: what it does, possible bugs, and one improvement. Use markdown code blocks. Reply in the user\'s language.',
  free: 'You are a helpful, concise assistant on Efrino\'s portfolio site. Reply in the user\'s language.',
};

// Simple in-memory rate limit: 20 requests per 10 minutes per IP.
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
}
setInterval(() => { const now = Date.now(); for (const [ip, l] of hits) if (l.every(t => now - t > 600000)) hits.delete(ip); }, 60000).unref();

let busy = 0; // Caps concurrent upstream calls to stay within free-tier limits.

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

// Knowledge-base answers used when no AI provider is available, so the
// playground still works (and never shows config errors to visitors).
const KB = [
  { k: ['siapa', 'who', 'about', 'tentang', 'profil', 'profile', 'kenal', 'introduce'], a: 'Efrino Wahyu Eko Pambudi adalah **Software Engineer** di Bekasi yang fokus pada digitalisasi industri, full-stack web, dan mobile. Saat ini **IT Programmer di PT Mekar Armada Jaya** (sejak Nov 2025), membangun sistem yang dipakai harian oleh tim pabrik: perencanaan produksi, stock-taking, gudang, dan Andon. Lulusan D3 Teknik Informatika Politeknik Negeri Semarang dengan **IPK 3.95**.' },
  { k: ['ppic', 'planner', 'pipeline', 'sse', 'produksi', 'production', 'planning', 'flagship'], a: '**PPIC Smart Planner** adalah proyek unggulan Efrino: memindahkan perencanaan produksi area Welding dari Excel ke web (CodeIgniter 3, Vue 3, MySQL).\n\n- Pipeline otomatis **16 langkah** yang menggabungkan **6 sumber data** (part master, forecast MDFO, delivery order, stok, kalender kerja, achievement shift) menjadi rencana harian per part per shift.\n- Progress real-time via **Server-Sent Events**.\n- **CMS Vue 3** agar planner bisa mengubah parameter & formula tanpa ubah kode.' },
  { k: ['mobile', 'flutter', 'android', 'ios', 'handheld', 'app', 'aplikasi'], a: 'Di mobile, Efrino membangun aplikasi **Flutter** untuk Android, iOS, dan handheld industri:\n\n- **STO Prep**: stock-taking dengan cetak tag QR di thermal printer 58mm.\n- **My Armada** & **Scan GR**: scan gudang, offline-ready.\n- **Meca Learning**: aplikasi training mekanik dengan konten offline, push notification, dan build iOS via Codemagic.\n\nStack: Riverpod, BLoC, Hive, SQLite, Supabase, Firebase.' },
  { k: ['pengalaman', 'experience', 'kerja', 'work', 'job', 'karir', 'career'], a: '**Pengalaman:**\n\n- **IT Programmer, PT Mekar Armada Jaya** (Nov 2025 – sekarang): PPIC Smart Planner, aplikasi stock-taking, goods receiving, dan warehouse scanning di Android handheld.\n- **External Auditor Intern, KAP Gatot Permadi, Azwir & Abimail** (Des 2023 – Jan 2024): verifikasi laporan keuangan dan rekonsiliasi data.' },
  { k: ['skill', 'stack', 'teknologi', 'technology', 'bahasa', 'language', 'keahlian', 'tools'], a: '**Skill utama:**\n\n- **Frontend:** Vue 3, React, Tailwind, Vite, TypeScript\n- **Backend:** CodeIgniter, Express, Hapi, FastAPI, Flask, REST/JWT/SSE\n- **Mobile:** Flutter (Riverpod, BLoC)\n- **Data:** MySQL, PostgreSQL, Supabase, Firebase, SQLite\n- **Lainnya:** Docker, integrasi SAP, barcode/QR, thermal printing, PyTorch\n- **Domain:** PPIC, MRP, BOM, inventory' },
  { k: ['proyek', 'project', 'portfolio', 'portofolio', 'nayea', 'ecommerce', 'e-commerce'], a: '**Proyek pilihan:**\n\n- **PPIC Smart Planner**: perencanaan produksi dengan pipeline 16 langkah.\n- **Nayea**: e-commerce modest fashion (React, Supabase dengan RLS).\n- **STO Prep, My Armada, Scan GR**: aplikasi Flutter untuk gudang dan lantai produksi.\n- **Meca Learning + Admin Console**: platform training mekanik.\n- **QC Defect Detection**: FastAPI + PyTorch DETR.\n- **AI WhatsApp Commerce Bot**: dengan fallback multi-provider AI.\n\nLihat bagian Projects di halaman ini untuk detail dan link.' },
  { k: ['ai', 'machine learning', 'ml', 'bot', 'otomasi', 'automation', 'llm'], a: 'Di AI & otomasi, Efrino membangun:\n\n- **QC Defect Detection**: deteksi cacat part stamping dengan DETR (PyTorch, FastAPI).\n- **AI WhatsApp Commerce Bot**: fuzzy product matching, pembayaran Midtrans, fallback Groq → Gemini → OpenRouter.\n- **YouTube Shorts Automation**: skrip AI → TTS → FFmpeg → upload otomatis.' },
  { k: ['pendidikan', 'education', 'kuliah', 'ipk', 'gpa', 'kampus', 'polines', 'university'], a: '**D3 Teknik Informatika, Politeknik Negeri Semarang**, IPK **3.95 / 4.00**.' },
  { k: ['kontak', 'contact', 'email', 'hubungi', 'hire', 'rekrut', 'linkedin', 'interview'], a: 'Efrino terbuka untuk posisi **Software Engineer, Full-Stack, atau Mobile** (onsite Jabodetabek maupun remote).\n\n- Email: **efrinowep@gmail.com**\n- LinkedIn: linkedin.com/in/efrinowep\n- GitHub: github.com/efrino' },
  { k: ['kenapa', 'why', 'hire him', 'kelebihan', 'strength', 'unggul', 'value'], a: 'Alasan merekrut Efrino:\n\n- **Terbukti di produksi**: sistemnya dipakai harian oleh tim pabrik, bukan sekadar demo.\n- **End-to-end**: dari skema database dan API sampai aplikasi Flutter di handheld.\n- **Paham domain bisnis**: PPIC, MRP, BOM, inventory, ditambah latar belakang audit.\n- **Integrasi nyata**: SAP, thermal printer, barcode/QR, Supabase.\n- **IPK 3.95**, cepat belajar dan konsisten.' },
];
const KB_FALLBACK = 'Saya belum punya jawaban spesifik untuk itu. Coba tanyakan tentang **pengalaman**, **proyek**, **PPIC Smart Planner**, **skill**, **mobile**, **pendidikan**, atau **kontak** Efrino. Untuk pertanyaan lain, silakan email **efrinowep@gmail.com**.';
const OFFLINE_MODE_MSG = 'Mode ini sedang dalam pemeliharaan. Sementara itu, coba tab **🎯 Ask about Efrino** untuk bertanya tentang pengalaman dan proyek Efrino.';

function kbAnswer(q) {
  const t = q.toLowerCase();
  let best = null, score = 0;
  for (const e of KB) {
    const s = e.k.filter(k => t.includes(k)).length;
    if (s > score) { best = e; score = s; }
  }
  return best ? best.a : KB_FALLBACK;
}

// Stream a fixed text in small chunks so it types out like a model reply.
async function streamText(res, text, provider) {
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
  const parts = text.match(/\S+\s*/g) || [text];
  for (const p of parts) {
    if (res.destroyed) return;
    res.write(JSON.stringify({ t: p }) + '\n');
    await new Promise(r => setTimeout(r, 25));
  }
  res.end(JSON.stringify({ t: '', done: true, provider }) + '\n');
}

function offlineReply(res, mode, history) {
  const last = history[history.length - 1].content;
  return streamText(res, mode === 'recruiter' ? kbAnswer(last) : OFFLINE_MODE_MSG, 'knowledge base');
}

async function chat(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return send(res, 429, { error: 'Terlalu banyak permintaan. Coba lagi beberapa menit lagi.' });
  if (busy >= 4) return send(res, 503, { error: 'AI sedang sibuk melayani pengunjung lain. Coba sebentar lagi.' });

  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 20000) return send(res, 413, { error: 'Pesan terlalu panjang.' }); }
  let body;
  try { body = JSON.parse(raw); } catch { return send(res, 400, { error: 'JSON tidak valid.' }); }

  const mode = SYSTEM_PROMPTS[body.mode] ? body.mode : 'recruiter';
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!history.length) return send(res, 400, { error: 'Pesan kosong.' });

  if (!PROVIDERS.length) return offlineReply(res, mode, history);

  busy++;
  const ctrl = new AbortController();
  res.on('close', () => ctrl.abort());
  try {
    const t0 = Date.now();
    let upstream, used;
    // Fall back to the next provider on quota or server errors.
    for (const p of PROVIDERS) {
      const r = await fetch(p.url, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
        body: JSON.stringify({
          model: p.model,
          stream: true,
          max_tokens: 600,
          temperature: mode === 'recruiter' ? 0.3 : 0.7,
          messages: [{ role: 'system', content: SYSTEM_PROMPTS[mode] }, ...history],
          ...p.extra,
        }),
      });
      if (r.ok) { upstream = r; used = p; break; }
      console.error(`${p.name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }
    if (!upstream) { console.error('all AI providers failed, using knowledge base'); return await offlineReply(res, mode, history); }
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no', 'X-AI-Provider': used.name });
    // Translate OpenAI-style SSE chunks into the NDJSON lines chat.js expects.
    const decoder = new TextDecoder();
    let buf = '', chars = 0;
    for await (const chunk of upstream.body) {
      buf += decoder.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:') || line === 'data: [DONE]') continue;
        const t = JSON.parse(line.slice(5)).choices?.[0]?.delta?.content;  // reasoning tokens arrive separately and are skipped
        if (t) { chars += t.length; res.write(JSON.stringify({ t }) + '\n'); }
      }
    }
    // Rough tokens/s estimate (~4 chars per token).
    res.end(JSON.stringify({ t: '', done: true, tps: +((chars / 4) / ((Date.now() - t0) / 1000)).toFixed(1), provider: used.name }) + '\n');
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e.message);
    if (!res.headersSent) send(res, 502, { error: 'Layanan AI sedang tidak tersedia. Coba lagi sebentar.' });
    else res.end();
  } finally {
    busy--;
  }
}

function health(res) {
  send(res, 200, { ok: true, model: PROVIDERS.map(p => p.name).join(' → ') || 'none', ready: PROVIDERS.length > 0 });
}

// --- Consultation leads (jasa.efrino.web.id), appended to a JSONL file on a persistent volume.
const leadHits = new Map();
async function createLead(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), recent = (leadHits.get(ip) || []).filter(t => now - t < 3600e3);
  if (recent.length >= 5) return send(res, 429, { error: 'Terlalu banyak pengiriman. Coba lagi nanti atau hubungi via WhatsApp.' });
  let raw = '';
  for await (const c of req) { raw += c; if (raw.length > 10000) return send(res, 413, { error: 'Data terlalu panjang.' }); }
  let b; try { b = JSON.parse(raw); } catch { return send(res, 400, { error: 'Data tidak valid.' }); }
  if (b.website) return send(res, 200, { ok: true }); // honeypot: bots fill hidden fields
  const s = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const lead = { at: new Date().toISOString(), name: s(b.name, 100), company: s(b.company, 120), whatsapp: s(b.whatsapp, 30).replace(/[^\d+]/g, ''),
    email: s(b.email, 120), need: s(b.need, 2000), budget: s(b.budget, 40), source: s(b.source, 40), ip };
  if (!lead.name || (!lead.whatsapp && !lead.email) || lead.need.length < 10)
    return send(res, 400, { error: 'Isi nama, WhatsApp atau email, dan ceritakan kebutuhan Anda (min. 10 karakter).' });
  try { await fs.promises.mkdir(DATA_DIR, { recursive: true }); await fs.promises.appendFile(LEADS_FILE, JSON.stringify(lead) + '\n'); }
  catch (e) { console.error('lead write failed', e.message); return send(res, 500, { error: 'Gagal menyimpan. Silakan hubungi via WhatsApp.' }); }
  recent.push(now); leadHits.set(ip, recent);
  console.log(`new lead: ${lead.name} / ${lead.company}`);
  send(res, 201, { ok: true });
}

async function listLeads(req, res) {
  const given = String(req.headers['x-leads-token'] || '');
  const ok = LEADS_TOKEN && given.length === LEADS_TOKEN.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(LEADS_TOKEN));
  if (!ok) return send(res, 401, { error: 'Token salah.' });
  let text = ''; try { text = await fs.promises.readFile(LEADS_FILE, 'utf8'); } catch {}
  send(res, 200, text.split('\n').filter(Boolean).map(l => JSON.parse(l)).reverse());
}

function serveStatic(req, res, file, roots = [PUBLIC]) {
  // Try each root in order (tools subdomain falls back to shared assets).
  const tryRoot = i => {
    if (i >= roots.length) {
      return fs.createReadStream(path.join(PUBLIC, '404.html')).on('open', function () { res.writeHead(404, { 'Content-Type': MIME['.html'] }); this.pipe(res); });
    }
    const p = path.normalize(path.join(roots[i], file));
    if (!p.startsWith(roots[i])) return send(res, 403, 'Forbidden', 'text/plain');
    fs.stat(p, (err, st) => {
      if (err || !st.isFile()) return tryRoot(i + 1);
      const ext = path.extname(p);
      const gzip = st.size > 1024 && /\.(html|js|css|json|svg|xml|txt|webmanifest)$/.test(p) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        // Vendored libraries are versioned, so they can be cached hard.
        'Cache-Control': ext === '.html' ? 'no-cache' : file.startsWith('/vendor/') ? 'public, max-age=604800, immutable' : 'public, max-age=3600',
        Vary: 'Accept-Encoding',
        ...(gzip ? { 'Content-Encoding': 'gzip' } : { 'Content-Length': st.size }),
      });
      const stream = fs.createReadStream(p);
      gzip ? stream.pipe(zlib.createGzip({ level: 6 })).pipe(res) : stream.pipe(res);
    });
  };
  tryRoot(0);
}

http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

  const host = (req.headers.host || '').split(':')[0].toLowerCase();
  const sub = host.endsWith(`.${DOMAIN}`) ? host.slice(0, -DOMAIN.length - 1) : '';
  const url = new URL(req.url, `http://${host || 'localhost'}`);

  if (REDIRECTS[sub]) {
    res.writeHead(sub === 'www' ? 301 : 302, { Location: REDIRECTS[sub] + (sub === 'www' ? url.pathname + url.search : '') });
    return res.end();
  }
  if (url.pathname === '/api/chat' && req.method === 'POST') return chat(req, res);
  if (url.pathname === '/api/health') return health(res);

  if (url.pathname === '/api/leads' && req.method === 'POST') return createLead(req, res);
  if (url.pathname === '/api/leads' && req.method === 'GET') return listLeads(req, res);

  let file = decodeURIComponent(url.pathname);
  if (SITES[sub]) {
    if (file === '/' || file.endsWith('/')) file += 'index.html';
    // Pretty URLs: /bg-remover -> /bg-remover.html
    if (!path.extname(file)) file += '.html';
    return serveStatic(req, res, file, [SITES[sub], PUBLIC]);
  }
  if (file === '/') file = sub === 'ai' ? '/playground.html' : '/index.html';
  serveStatic(req, res, file);
}).listen(PORT, () => console.log(`listening on :${PORT} (AI: ${PROVIDERS.map(p => p.name).join(" → ") || "not configured"})`));
