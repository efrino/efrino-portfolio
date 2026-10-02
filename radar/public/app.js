const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let tt; const toast = m => { const t = $('#toast'); t.textContent = m; t.className = 'toast show'; clearTimeout(tt); tt = setTimeout(() => t.className = 'toast', 2800); };
const api = async (p, opt = {}) => {
  const r = await fetch('/api/' + p, { method: opt.method || 'GET', headers: { 'x-requested-with': 'radar', ...(opt.body ? { 'content-type': 'application/json' } : {}) }, body: opt.body ? JSON.stringify(opt.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && p !== 'login') { login(); throw new Error('login'); }
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
};
const SRC = { remotive: 'Remotive', remoteok: 'Remote OK', weworkremotely: 'We Work Remotely', himalayas: 'Himalayas', arbeitnow: 'Arbeitnow', hn: 'Hacker News', manual: 'Manual', jasa: 'Lead jasa' };
const TABS = [['career', 'new', '🧑‍💻 Karier'], ['business', 'new', '💼 Bisnis'], ['all', 'shortlist', '⭐ Shortlist'], ['all', 'sent', '📨 Terkirim']];
let tab = 0;

function login() {
  $('#root').innerHTML = `<div class="login"><form id="lf" class="card"><div class="logo">efrino<b>.</b>radar</div><p style="color:var(--muted);font-size:14px">Khusus pemilik.</p>
    <input class="in" type="password" name="password" placeholder="Password" autofocus autocomplete="current-password"><button class="btn primary">Masuk</button></form></div>`;
  $('#lf').onsubmit = async e => { e.preventDefault(); try { await api('login', { method: 'POST', body: { password: e.target.password.value } }); main(); } catch (err) { toast(err.message); } };
}

async function main() {
  const s = await api('stats');
  $('#root').innerHTML = `<div class="wrap">
    <div class="top"><div class="logo">efrino<b>.</b>radar</div><div class="actions"><button class="btn" id="paste">＋ Tempel lowongan/proyek</button><button class="btn" id="prof">⚙️ Profil</button><button class="btn" id="wa">💬 WhatsApp</button><button class="btn" id="tg">📲 Kirim ringkasan</button><button class="btn" id="run">⟳ Cari sekarang</button></div></div>
    <div class="stats"><div class="stat"><b>${s.good}</b><span>Peluang cocok baru</span></div><div class="stat"><b>${s.shortlist}</b><span>Shortlist</span></div><div class="stat"><b>${s.sent}</b><span>Terkirim</span></div>
      <div class="stat"><b>${s.total}</b><span>Dipantau (${s.unscored} antre dinilai)</span></div><div class="stat"><b style="font-size:15px">${s.lastRun ? new Date(s.lastRun).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '–'}</b><span>Pencarian terakhir</span></div></div>
    <div id="panel"></div>
    <div class="tabs">${TABS.map((t, i) => `<button data-i="${i}" class="${i === tab ? 'active' : ''}">${t[2]}</button>`).join('')}</div>
    <div class="list" id="list"></div>
    <p class="src" style="margin-top:18px">Sumber: ${Object.values(SRC).slice(0, 6).join(', ')} (API/RSS publik) · lowongan dari situs lain cukup ditempel. Radar tidak pernah mengirim apa pun atas nama Anda.</p></div>`;
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { tab = +b.dataset.i; document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b)); list(); });
  $('#tg').onclick = async () => { try { const r = await api('digest', { method: 'POST' }); toast('Ringkasan terkirim ke ' + r.sent.join(' & ')); } catch (e) { toast(e.message); } };
  $('#wa').onclick = waPanel;
  $('#run').onclick = async e => { e.target.disabled = true; await api('run', { method: 'POST' }); toast('Mencari di latar belakang… muat ulang beberapa menit lagi'); };
  $('#paste').onclick = () => { $('#panel').innerHTML = `<form class="card" id="mf"><b>Tempel lowongan atau permintaan proyek</b><p style="color:var(--muted);font-size:14px">Dari LinkedIn, Glints, JobStreet, Projects.co.id, grup WhatsApp/Facebook, dsb. Radar menilai & menyiapkan draft.</p>
      <input class="in" name="url" placeholder="Link (opsional)"><textarea name="text" rows="8" placeholder="Tempel seluruh isi lowongan di sini…"></textarea><div class="actions"><button class="btn primary">Nilai & simpan</button><button type="button" class="btn" id="cx">Batal</button></div></form>`;
    $('#cx').onclick = () => $('#panel').innerHTML = '';
    $('#mf').onsubmit = async e => { e.preventDefault(); const b = e.target.querySelector('.primary'); b.disabled = true; b.textContent = 'Menilai…';
      try { const it = await api('manual', { method: 'POST', body: { text: e.target.text.value, url: e.target.url.value } }); $('#panel').innerHTML = ''; tab = 2; main(); toast(`Skor ${it.score}: disimpan ke Shortlist`); } catch (err) { toast(err.message); b.disabled = false; b.textContent = 'Nilai & simpan'; } }; };
  $('#prof').onclick = async () => { const p = await api('profile'); $('#panel').innerHTML = `<form class="card" id="pf"><b>Profil & preferensi</b>
      <label>Tentang saya (dipakai AI untuk menilai & menulis draft)<textarea name="about" rows="8">${esc(p.about)}</textarea></label>
      <label>Yang dicari<textarea name="wants" rows="2">${esc(p.wants)}</textarea></label>
      <label>Kata kunci wajib (salah satu, pisahkan koma)<input class="in" name="include" value="${esc(p.include)}"></label>
      <label>Kata kunci ditolak<input class="in" name="exclude" value="${esc(p.exclude)}"></label>
      <label>Skor minimal ditampilkan<input class="in" name="minScore" type="number" min="0" max="100" value="${p.minScore}"></label>
      <div class="actions"><button class="btn primary">Simpan</button><button type="button" class="btn" id="cx">Tutup</button></div></form>`;
    $('#cx').onclick = () => $('#panel').innerHTML = '';
    $('#pf').onsubmit = async e => { e.preventDefault(); await api('profile', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }); toast('Profil disimpan'); $('#panel').innerHTML = ''; list(); }; };
  list();
}

let waTimer;
async function waPanel() {
  clearTimeout(waTimer);
  const s = await api('wa'), el = $('#panel');
  const label = { connected: 'Terhubung', qr: 'Menunggu ditautkan', connecting: 'Menghubungkan…', reconnecting: 'Menyambung ulang…', disconnected: 'Belum terhubung' }[s.status] || s.status;
  el.innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>💬 Laporan via WhatsApp</b><span style="color:var(--muted)">${label}</span></div>
    <p style="color:var(--muted);font-size:14px">Pengirim: <b>+${esc(s.from)}</b> → penerima: <b>+${esc(s.to)}</b>. Pengirim hanya mengirim ke penerima ini, maks. sekali sehari + tes manual.</p>
    ${s.status === 'connected' ? `<div class="actions"><button class="btn primary" data-w="test">Kirim pesan tes</button><button class="btn" data-w="logout">Putuskan</button><button class="btn" data-w="close">Tutup</button></div>`
    : s.status === 'qr' ? `<div style="display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center">${s.qr ? `<img src="${s.qr}" alt="QR" style="width:220px;border-radius:12px;background:#fff;padding:6px">` : ''}
        <div style="font-size:14px;color:var(--muted)">${s.code ? `<div style="font-size:13px">Kode tautan untuk +${esc(s.from)}:</div><div style="font-family:var(--mono);font-size:30px;letter-spacing:4px;color:var(--text);margin:6px 0 12px">${esc(s.code.match(/.{1,4}/g).join('-'))}</div>
          Di HP pengirim: WhatsApp → ⋮ → <b>Perangkat tertaut</b> → <b>Tautkan perangkat</b> → <b>Tautkan dengan nomor telepon</b>, lalu ketik kode ini.` : `Di HP pengirim: WhatsApp → ⋮ → <b>Perangkat tertaut</b> → <b>Tautkan perangkat</b>, lalu scan QR.<br><br>Tidak bisa scan (QR di HP yang sama)? <button class="btn" data-w="code">Pakai kode tautan</button>`}</div></div>`
    : `<p style="font-size:14px;color:var(--muted)">Koneksi tidak resmi (Baileys): nomor pengirim bisa dibatasi WhatsApp. Karena itu pengirimnya nomor terpisah, bukan nomor admin Anda.</p>
       <div class="actions"><button class="btn primary" data-w="code">Tautkan dengan kode (disarankan)</button><button class="btn" data-w="qr">Tautkan dengan QR</button><button class="btn" data-w="close">Tutup</button></div>`}</div>`;
  el.querySelectorAll('[data-w]').forEach(b => b.onclick = async () => {
    const w = b.dataset.w;
    if (w === 'close') { clearTimeout(waTimer); el.innerHTML = ''; return; }
    b.disabled = true;
    try {
      if (w === 'test') { await api('wa/test', { method: 'POST' }); toast('Pesan tes terkirim'); }
      else if (w === 'logout') { await api('wa/logout', { method: 'POST' }); toast('Diputus'); }
      else await api('wa/connect', { method: 'POST', body: { pairing: w === 'code' } });
    } catch (e) { toast(e.message); }
    waPanel();
  });
  if (['qr', 'connecting', 'reconnecting'].includes(s.status)) waTimer = setTimeout(waPanel, 3000);
}

async function list() {
  const [track, status] = TABS[tab];
  const rows = await api(`items?track=${track}&status=${status}`);
  $('#list').innerHTML = rows.length ? rows.map(it => `<div class="item" data-id="${it.id}">
    <div class="head"><div class="score ${it.score >= 80 ? 'hi' : it.score >= 60 ? 'mid' : ''}">${it.score ?? '…'}</div>
      <div><h3>${esc(it.title)}</h3><div class="meta">${esc(it.company)}${it.location ? ' · ' + esc(it.location) : ''}${it.salary ? ' · ' + esc(it.salary) : ''}</div><div class="src">via ${esc(SRC[it.source] || it.source)} · ${it.track === 'business' ? 'Bisnis' : 'Karier'}</div></div>
      <div class="actions">${it.url ? `<a class="btn" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">Buka ↗</a>` : ''}</div></div>
    ${it.summary ? `<p>${esc(it.summary)}</p>` : ''}
    ${it.why?.length ? `<div class="chips">${it.why.slice(0, 4).map(w => `<span>✓ ${esc(w)}</span>`).join('')}</div>` : ''}
    ${it.concerns?.length ? `<div class="chips warn">${it.concerns.slice(0, 3).map(w => `<span>! ${esc(w)}</span>`).join('')}</div>` : ''}
    <div class="draft"></div>
    <div class="actions"><button class="btn" data-a="draft">✍️ ${it.has_draft ? 'Lihat draft' : 'Buat draft'}</button>
      ${status !== 'shortlist' ? '<button class="btn" data-a="shortlist">⭐ Shortlist</button>' : ''}${status !== 'sent' ? '<button class="btn" data-a="sent">📨 Sudah saya kirim</button>' : ''}<button class="btn" data-a="archived">Arsipkan</button></div></div>`).join('')
    : `<div class="empty">${status === 'new' ? 'Belum ada peluang di atas skor minimal. Radar mencari otomatis tiap 6 jam, atau klik "Cari sekarang".' : 'Kosong.'}</div>`;
  document.querySelectorAll('.item').forEach(el => el.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
    const id = el.dataset.id, a = b.dataset.a;
    if (a === 'draft') {
      b.disabled = true; b.textContent = 'Menulis…';
      try {
        const d = (await api(`items/${id}`)).draft || (await api(`items/${id}/draft`, { method: 'POST', body: {} })).draft;
        el.querySelector('.draft').innerHTML = `<textarea rows="10">${esc(d)}</textarea><div class="actions" style="margin-top:6px"><button class="btn" data-x="copy">📋 Salin</button><button class="btn" data-x="save">Simpan edit</button><button class="btn" data-x="en">Tulis ulang (English)</button><button class="btn" data-x="id">Tulis ulang (Indonesia)</button></div>`;
        const ta = el.querySelector('textarea');
        el.querySelector('[data-x=copy]').onclick = () => { navigator.clipboard.writeText(ta.value); toast('Disalin. Edit seperlunya lalu kirim sendiri.'); };
        el.querySelector('[data-x=save]').onclick = async () => { await api(`items/${id}/draft`, { method: 'POST', body: { text: ta.value } }); toast('Tersimpan'); };
        for (const l of ['en', 'id']) el.querySelector(`[data-x=${l}]`).onclick = async () => { ta.value = 'Menulis…'; ta.value = (await api(`items/${id}/draft`, { method: 'POST', body: { lang: l } })).draft; };
      } catch (e) { toast(e.message); }
      b.disabled = false; b.textContent = '✍️ Lihat draft'; return;
    }
    await api(`items/${id}/status`, { method: 'POST', body: { status: a } });
    el.remove(); toast({ shortlist: 'Masuk shortlist', sent: 'Ditandai terkirim, ingat follow-up 5–7 hari lagi', archived: 'Diarsipkan' }[a]);
  }));
}
api('stats').then(main).catch(() => {});
