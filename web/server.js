// Zero-dependency server: static files, subdomain routing, and a rate-limited AI chat proxy (Groq / Gemini free tiers).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
// AI runs on free-tier hosted APIs (never on this VPS). Providers are tried in order.
const PROVIDERS = [
  { name: 'groq', key: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', url: 'https://api.groq.com/openai/v1/chat/completions' },
  { name: 'gemini', key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' },
].filter(p => p.key);
const DOMAIN = process.env.DOMAIN || 'efrino.web.id';
const PUBLIC = path.join(__dirname, 'public');

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

let busy = 0; // Only a couple of concurrent generations on a CPU box.

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function chat(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return send(res, 429, { error: 'Terlalu banyak permintaan. Coba lagi beberapa menit lagi.' });
  if (busy >= 2) return send(res, 503, { error: 'AI sedang sibuk melayani pengunjung lain. Coba sebentar lagi.' });

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

  if (!PROVIDERS.length) return send(res, 503, { error: 'AI belum dikonfigurasi (GROQ_API_KEY / GEMINI_API_KEY kosong).' });

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
        }),
      });
      if (r.ok) { upstream = r; used = p; break; }
      console.error(`${p.name} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }
    if (!upstream) throw new Error('all providers failed');
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
        const t = JSON.parse(line.slice(5)).choices?.[0]?.delta?.content;
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

function serveStatic(req, res, file) {
  const p = path.normalize(path.join(PUBLIC, file));
  if (!p.startsWith(PUBLIC)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.stat(p, (err, st) => {
    if (err || !st.isFile()) {
      return fs.createReadStream(path.join(PUBLIC, '404.html')).on('open', function () { res.writeHead(404, { 'Content-Type': MIME['.html'] }); this.pipe(res); });
    }
    const ext = path.extname(p);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    });
    fs.createReadStream(p).pipe(res);
  });
}

http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  const host = (req.headers.host || '').split(':')[0].toLowerCase();
  const sub = host.endsWith(`.${DOMAIN}`) ? host.slice(0, -DOMAIN.length - 1) : '';
  const url = new URL(req.url, `http://${host || 'localhost'}`);

  if (REDIRECTS[sub]) {
    res.writeHead(sub === 'www' ? 301 : 302, { Location: REDIRECTS[sub] + (sub === 'www' ? url.pathname + url.search : '') });
    return res.end();
  }
  if (url.pathname === '/api/chat' && req.method === 'POST') return chat(req, res);
  if (url.pathname === '/api/health') return health(res);

  let file = decodeURIComponent(url.pathname);
  if (file === '/') file = sub === 'ai' ? '/playground.html' : '/index.html';
  serveStatic(req, res, file);
}).listen(PORT, () => console.log(`listening on :${PORT} (model ${MODEL})`));
