// AI playground widget, shared by index.html and playground.html.
const SUGGEST = {
  recruiter: ['Siapa Efrino dan apa keahliannya?', 'What is the PPIC Smart Planner?', 'Pengalaman mobile development-nya?', 'Why should we hire him?'],
  code: ['Jelaskan: const x = arr.reduce((a,b)=>a+b,0)', 'Review: SELECT * FROM users WHERE id = ' + "'\" + id + \"'"],
  free: ['Buat ide nama startup logistik', 'Explain SSE vs WebSocket in 3 bullets'],
};
const GREET = {
  recruiter: 'Halo! 👋 Saya **Efrino AI**, dengan jawaban yang di-grounding ke CV Efrino. Tanyakan apa saja tentang pengalaman, proyek, atau skill-nya.',
  code: 'Mode **Code Explainer**. Tempel potongan kode, saya jelaskan & review.',
  free: 'Mode **Free Chat**. Tanya apa saja.',
};

function esc(s) { return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function md(s) {
  return esc(s)
    .replace(/```\w*\n?([\s\S]*?)(```|$)/g, (_, c) => `<pre><code>${c}</code></pre>`)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

export function mountChat(root) {
  const log = root.querySelector('.log'), form = root.querySelector('form'), input = root.querySelector('textarea');
  const sendBtn = root.querySelector('.send'), suggest = root.querySelector('.suggest'), status = root.querySelector('.model-status');
  let mode = 'recruiter', history = [], busy = false;

  const add = (role, html, cls = '') => {
    const el = document.createElement('div');
    el.className = `msg ${role} ${cls}`;
    el.innerHTML = html;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };
  const reset = () => {
    history = []; log.innerHTML = '';
    add('bot', md(GREET[mode]));
    suggest.innerHTML = '';
    SUGGEST[mode].forEach(q => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = q;
      b.onclick = () => { input.value = q; form.requestSubmit(); };
      suggest.appendChild(b);
    });
  };

  root.querySelectorAll('.modes button').forEach(b => b.onclick = () => {
    if (busy) return;
    root.querySelectorAll('.modes button').forEach(x => x.classList.toggle('active', x === b));
    mode = b.dataset.mode; reset();
  });

  const checkHealth = async () => {
    try {
      const j = await (await fetch('/api/health')).json();
      status.classList.toggle('ready', j.ready);
      status.querySelector('span').textContent = j.ready ? `${j.model} · online` : `${j.model} · warming up`;
      if (!j.ready) setTimeout(checkHealth, 15000);
    } catch { status.querySelector('span').textContent = 'offline'; }
  };
  checkHealth();

  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  input.addEventListener('input', () => { input.style.height = '48px'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true; sendBtn.disabled = true; input.value = ''; input.style.height = '48px'; suggest.innerHTML = '';
    add('user', esc(text));
    history.push({ role: 'user', content: text });
    const el = add('bot', '<span class="dots"><span></span><span></span><span></span></span>');
    let out = '', tps, t0 = performance.now();
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, messages: history }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const l of lines) {
          if (!l) continue;
          const j = JSON.parse(l);
          out += j.t; if (j.tps) tps = j.tps;
          el.innerHTML = md(out) + '<span class="caret" style="display:inline-block;width:7px;height:1em;background:var(--accent2);vertical-align:middle"></span>';
          log.scrollTop = log.scrollHeight;
        }
      }
      el.innerHTML = md(out) + `<span class="meta">⚡ ${tps ? tps + ' tok/s · ' : ''}${((performance.now() - t0) / 1000).toFixed(1)}s</span>`;
      history.push({ role: 'assistant', content: out });
    } catch (err) {
      el.classList.add('err'); el.textContent = '⚠️ ' + err.message;
      history.pop();
    }
    busy = false; sendBtn.disabled = false; input.focus();
  });

  reset();
}

export const chatMarkup = `
<div class="chat">
  <div class="chat-head">
    <div class="modes">
      <button class="active" data-mode="recruiter">🎯 Ask about Efrino</button>
      <button data-mode="code">🧑‍💻 Code Explainer</button>
      <button data-mode="free">💬 Free Chat</button>
    </div>
    <div class="model-status"><i></i><span>checking…</span></div>
  </div>
  <div class="log"></div>
  <div class="suggest"></div>
  <form><textarea placeholder="Tulis pertanyaan… (Enter untuk kirim)" maxlength="3000"></textarea><button class="send" aria-label="Kirim">↑</button></form>
</div>`;
