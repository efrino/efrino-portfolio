// Zero-dependency server: static files, subdomain routing, and a rate-limited Ollama chat proxy.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
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
  free: 'You are a helpful, concise assistant running locally on Efrino\'s own server via Ollama. Reply in the user\'s language.',
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

  busy++;
  const ctrl = new AbortController();
  res.on('close', () => ctrl.abort());
  try {
    const upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        keep_alive: '30m',
        messages: [{ role: 'system', content: SYSTEM_PROMPTS[mode] }, ...history],
        options: { num_predict: 500, temperature: mode === 'recruiter' ? 0.3 : 0.7, num_ctx: 4096 },
      }),
    });
    if (!upstream.ok) throw new Error(`ollama ${upstream.status}`);
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
    const decoder = new TextDecoder();
    let buf = '';
    for await (const chunk of upstream.body) {
      buf += decoder.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        const j = JSON.parse(line);
        res.write(JSON.stringify({ t: j.message?.content || '', done: j.done, tps: j.eval_count && j.eval_duration ? +(j.eval_count / (j.eval_duration / 1e9)).toFixed(1) : undefined }) + '\n');
      }
    }
    res.end();
  } catch (e) {
    if (!res.headersSent) send(res, 502, { error: 'Model AI belum siap (mungkin masih diunduh). Coba lagi sebentar.' });
    else res.end();
  } finally {
    busy--;
  }
}

async function health(res) {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    const j = await r.json();
    send(res, 200, { ok: true, model: MODEL, ready: (j.models || []).some(m => m.name.startsWith(MODEL)) });
  } catch { send(res, 200, { ok: true, model: MODEL, ready: false }); }
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

// Make sure the model exists in the Ollama volume; retries until Ollama is up.
async function ensureModel() {
  try {
    const tags = await (await fetch(`${OLLAMA_URL}/api/tags`)).json();
    if ((tags.models || []).some(m => m.name.startsWith(MODEL))) return console.log(`model ${MODEL} ready`);
    console.log(`pulling ${MODEL}…`);
    const r = await fetch(`${OLLAMA_URL}/api/pull`, { method: 'POST', body: JSON.stringify({ model: MODEL, stream: false }) });
    console.log(`pull ${MODEL}: ${r.status}`);
  } catch (e) {
    console.log(`ollama not reachable yet (${e.message}), retrying in 10s`);
    setTimeout(ensureModel, 10000);
  }
}
ensureModel();

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
