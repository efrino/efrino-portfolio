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
const SRC = { remotive: 'Remotive', remoteok: 'Remote OK', weworkremotely: 'We Work Remotely', himalayas: 'Himalayas', arbeitnow: 'Arbeitnow', hn: 'Hacker News', manual: 'Manual', jasa: 'Lead jasa', shared: 'Dibagikan dari HP' };
const TABS = [['career', 'new', '🧑‍💻 Karier'], ['business', 'new', '💼 Bisnis'], ['all', 'shortlist', '⭐ Shortlist'], ['all', 'sent', '📨 Terkirim'], ['assistant', '', '🤖 Asisten']];
let tab = 0;

function login() {
  $('#root').innerHTML = `<div class="login"><form id="lf" class="card"><div class="logo">efrino<b>.</b>radar</div><p style="color:var(--muted);font-size:14px">Khusus pemilik.</p>
    <input class="in" type="password" name="password" placeholder="Password" autofocus autocomplete="current-password"><button class="btn primary">Masuk</button></form></div>`;
  $('#lf').onsubmit = async e => { e.preventDefault(); try { await api('login', { method: 'POST', body: { password: e.target.password.value } }); main(); } catch (err) { toast(err.message); } };
}

async function main() {
  const s = await api('stats');
  $('#root').innerHTML = `<div class="wrap">
    <div class="top"><div class="logo">efrino<b>.</b>radar</div><div class="actions"><button class="btn" id="paste">＋ Tempel lowongan/proyek</button><button class="btn" id="prof">⚙️ Profil</button><button class="btn" id="phone">📱 Pasang di HP</button><button class="btn" id="wa">💬 WhatsApp</button><button class="btn" id="tg">📲 Kirim ringkasan</button><button class="btn" id="run">⟳ Cari sekarang</button></div></div>
    <div class="stats"><div class="stat"><b>${s.good}</b><span>Peluang cocok baru</span></div><div class="stat"><b>${s.shortlist}</b><span>Shortlist</span></div><div class="stat"><b>${s.sent}</b><span>Terkirim</span></div>
      <div class="stat"><b>${s.total}</b><span>Dipantau (${s.unscored} antre dinilai)</span></div><div class="stat"><b style="font-size:15px">${s.lastRun ? new Date(s.lastRun).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '–'}</b><span>Pencarian terakhir</span></div></div>
    <div id="panel"></div>
    <div class="tabs">${TABS.map((t, i) => `<button data-i="${i}" class="${i === tab ? 'active' : ''}">${t[2]}</button>`).join('')}</div>
    <div class="list" id="list"></div>
    <p class="src" style="margin-top:18px">Sumber: ${Object.values(SRC).slice(0, 6).join(', ')} (API/RSS publik) · lowongan dari situs lain cukup ditempel. Email ke orang lain hanya terkirim setelah Anda menekan “Kirim email”.</p></div>`;
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { tab = +b.dataset.i; document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b)); list(); });
  $('#tg').onclick = async () => { try { const r = await api('digest', { method: 'POST' }); toast('Ringkasan terkirim ke ' + r.sent.join(' & ')); } catch (e) { toast(e.message); } };
  $('#wa').onclick = waPanel;
  $('#phone').onclick = phonePanel;
  const shared = new URLSearchParams(location.search).get('share'); // Android share target
  if (shared) { history.replaceState({}, '', '/'); api('share', { method: 'POST', body: JSON.parse(shared) }).then(it => { tab = 2; toast(it.score != null ? `Tersimpan, skor ${it.score}` : 'Tersimpan di Shortlist: tekan Lengkapi untuk dinilai'); main(); }).catch(e => toast(e.message)); }
  $('#run').onclick = async e => { e.target.disabled = true; await api('run', { method: 'POST' }); toast('Mencari di latar belakang… muat ulang beberapa menit lagi'); };
  $('#paste').onclick = () => { $('#panel').innerHTML = `<form class="card" id="mf"><b>Tempel lowongan atau permintaan proyek</b><p style="color:var(--muted);font-size:14px">Dari LinkedIn, Glints, JobStreet, Projects.co.id, grup WhatsApp/Facebook, dsb. Radar menilai & menyiapkan draft.</p>
      <input class="in" name="url" placeholder="Link (opsional)"><textarea name="text" rows="8" placeholder="Tempel isi lowongan di sini, atau pakai tombol 📷 Dari screenshot di bawah…"></textarea><div class="actions"><button class="btn primary">Nilai & simpan</button><button type="button" class="btn" id="cx">Batal</button></div></form>`;
    imageTools($('#mf textarea'));
    $('#cx').onclick = () => $('#panel').innerHTML = '';
    $('#mf').onsubmit = async e => { e.preventDefault(); const b = e.target.querySelector('.primary'); b.disabled = true; b.textContent = 'Menilai…';
      try { const it = await api('manual', { method: 'POST', body: { text: e.target.text.value, url: e.target.url.value } }); $('#panel').innerHTML = ''; tab = 2; main(); toast(it.score != null ? `Skor ${it.score}: disimpan ke Shortlist` : 'Disimpan ke Shortlist. AI sedang sibuk; dinilai otomatis nanti.'); } catch (err) { toast(err.message); b.disabled = false; b.textContent = 'Nilai & simpan'; } }; };
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

async function phonePanel() {
  const { token, endpoint } = await api('share-token');
  const ios = /iPhone|iPad/.test(navigator.userAgent);
  $('#panel').innerHTML = `<div class="card"><b>📱 Radar di HP</b>
    <div><b style="font-size:14px">1. Jadikan seperti aplikasi</b><ol class="steps"><li>${ios ? 'Buka radar.efrino.web.id di <b>Safari</b>' : 'Buka di Chrome'} lalu login.</li><li>${ios ? 'Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) → <b>Tambah ke Layar Utama</b>' : 'Menu ⋮ → <b>Instal aplikasi</b>'}.</li><li>Buka Radar dari ikon di layar utama: tampil layar penuh seperti aplikasi.</li></ol></div>
    <div><b style="font-size:14px">2. Kirim lowongan dari LinkedIn lewat "Bagikan" (iPhone: pakai Pintasan)</b>
    <ol class="steps"><li>Buka app <b>Pintasan / Shortcuts</b> → <b>+</b> → beri nama <b>Kirim ke Radar</b>.</li>
      <li>Ketuk ⓘ (info) → aktifkan <b>Tampilkan di Lembar Bagikan</b>; jenis input: <b>URL</b> dan <b>Teks</b>.</li>
      <li>Tambah tindakan <b>Dapatkan Isi URL</b> (Get Contents of URL): URL <code>${esc(endpoint)}</code>, Metode <b>POST</b>,
        Header <code>Authorization</code> = <code>Bearer ${esc(token)}</code>, Isi Permintaan <b>JSON</b> dengan bidang <code>url</code> = <i>Input Pintasan</i> dan <code>text</code> = <i>Input Pintasan</i>.</li>
      <li>Tambah <b>Dapatkan Nilai Kamus</b> (Get Dictionary Value) kunci <code>message</code>, lalu <b>Tampilkan Pemberitahuan</b> dengan hasilnya.</li>
      <li>Di LinkedIn: buka lowongan → <b>Bagikan</b> → <b>Lainnya</b> → <b>Kirim ke Radar</b>. Selesai, masuk ke Shortlist.</li></ol>
    <p style="color:var(--muted);font-size:13px">Android: setelah Instal aplikasi, "Radar" otomatis muncul di menu Bagikan, tidak perlu Pintasan.</p>
    <div class="actions"><button class="btn" id="cpTok">📋 Salin token</button><button class="btn" id="cpUrl">📋 Salin alamat</button><button class="btn" id="newTok">Buat token baru</button><button class="btn" id="cx2">Tutup</button></div>
    <p style="color:var(--muted);font-size:12.5px">Token ini seperti kunci: siapa pun yang punya bisa menambah item ke Radar Anda (tidak bisa membaca data). Ganti bila bocor.</p></div></div>`;
  $('#cpTok').onclick = () => { navigator.clipboard.writeText('Bearer ' + token); toast('Token disalin (sudah termasuk "Bearer ")'); };
  $('#cpUrl').onclick = () => { navigator.clipboard.writeText(endpoint); toast('Alamat disalin'); };
  $('#newTok').onclick = async () => { if (!confirm('Buat token baru? Pintasan lama berhenti bekerja.')) return; await api('share-token', { method: 'POST' }); phonePanel(); toast('Token baru dibuat: perbarui di Pintasan'); };
  $('#cx2').onclick = () => $('#panel').innerHTML = '';
}

// Screenshot -> text. Images are downscaled on the phone first (fast upload, fewer tokens).
async function shrink(file) {
  const bmp = await createImageBitmap(file); const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.85);
}
function imageTools(ta) {
  const wrap = document.createElement('div'); wrap.className = 'actions'; wrap.style.marginTop = '6px';
  wrap.innerHTML = `<label class="btn">📷 Dari screenshot<input type="file" accept="image/*" multiple hidden></label><span class="src" style="align-self:center">Boleh beberapa gambar (urut atas → bawah). Bisa juga tempel gambar langsung (Ctrl/⌘+V).</span>`;
  const run = async files => {
    const imgs = [...files].filter(f => f.type.startsWith('image/')).slice(0, 6); if (!imgs.length) return;
    const old = ta.value; ta.value = `Membaca ${imgs.length} gambar…`; ta.disabled = true;
    try { const { text } = await api('extract', { method: 'POST', body: { images: await Promise.all(imgs.map(shrink)) } }); ta.value = (old && !old.startsWith('Membaca') ? old + '\n\n' : '') + text; toast('Teks dari gambar siap. Periksa dulu, lalu simpan.'); }
    catch (e) { ta.value = old; toast(e.message); }
    ta.disabled = false; ta.focus();
  };
  wrap.querySelector('input').onchange = e => run(e.target.files);
  ta.addEventListener('paste', e => { const f = [...e.clipboardData.items].filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()); if (f.length) { e.preventDefault(); run(f); } });
  ta.after(wrap);
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
  if (TABS[tab][0] === 'assistant') return chat();
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
    ${it.source === 'shared' && (!it.score && it.score !== 0) ? '<div class="complete"></div>' : ''}
    <div class="actions">${it.source === 'shared' ? '<button class="btn" data-a="complete">📝 Lengkapi</button>' : ''}<button class="btn" data-a="draft">✍️ ${it.has_draft ? 'Lihat draft' : 'Buat draft'}</button>
      ${status !== 'shortlist' ? '<button class="btn" data-a="shortlist">⭐ Shortlist</button>' : ''}${status !== 'sent' ? '<button class="btn" data-a="sent">📨 Sudah saya kirim</button>' : ''}<button class="btn" data-a="archived">Arsipkan</button></div></div>`).join('')
    : `<div class="empty">${status === 'new' ? 'Belum ada peluang di atas skor minimal. Radar mencari otomatis tiap 6 jam, atau klik "Cari sekarang".' : 'Kosong.'}</div>`;
  document.querySelectorAll('.item').forEach(el => el.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
    const id = el.dataset.id, a = b.dataset.a;
    if (a === 'complete') {
      const box = el.querySelector('.draft');
      box.innerHTML = `<textarea rows="8" placeholder="Tempel isi lowongan, atau ambil dari screenshot (tombol di bawah)…"></textarea><div class="actions" style="margin-top:6px"><button class="btn primary" data-x="go">Nilai sekarang</button></div>`;
      imageTools(box.querySelector('textarea'));
      box.querySelector('[data-x=go]').onclick = async e => { e.target.disabled = true; e.target.textContent = 'Menilai…';
        try { const r = await api(`items/${id}/complete`, { method: 'POST', body: { text: box.querySelector('textarea').value } }); toast(r.score != null ? `Skor ${r.score}` : 'Tersimpan. AI sedang sibuk; dinilai otomatis nanti.'); list(); } catch (err) { toast(err.message); e.target.disabled = false; e.target.textContent = 'Nilai sekarang'; } };
      return;
    }
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

// --- AI assistant
// Light markdown: tables, code, bold, headings, bullets, #id links.
const md = t => {
  const tables = [];
  t = String(t).replace(/(^\|.+\|\s*$\n?)+/gm, blk => {
    const rows = blk.trim().split('\n').filter(r => !/^\|\s*:?-{2,}/.test(r)).map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    tables.push(`<div class="tbl"><table>${rows.map((r, i) => `<tr>${r.map(c => `<${i ? 'td' : 'th'}>${inl(esc(c).replace(/&lt;br\s*\/?&gt;/g, '<br>'))}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</table></div>`);
    return `\u0000${tables.length - 1}\u0000\n`;
  });
  return inl(esc(t).replace(/```([\s\S]*?)```/g, (_, c) => `<pre>${c.trim()}</pre>`).replace(/^#{1,4} (.+)$/gm, '<b>$1</b>').replace(/^\s*[-*] (.+)$/gm, '• $1'))
    .replace(/\n/g, '<br>').replace(/\u0000(\d+)\u0000(<br>)?/g, (_, i) => tables[i]);
};
const inl = h => h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/(^|\s|>)#(\d+)\b/g, '$1<a href="#" data-item="$2">#$2</a>');
function metaHtml(meta) {
  if (!meta) return '';
  const files = (meta.files || []).map(f => `<a class="btn" href="${esc(f.url)}" target="_blank" rel="noopener">📄 ${esc(f.name)}</a>`).join('');
  const acts = (meta.actions || []).map(a => a.status && a.status !== 'pending' ? `<div class="act"><b>${a.status === 'done' ? '✅ Email terkirim' : '✖️ Email dibatalkan'}</b><div class="meta">Ke: ${esc(a.to)} · ${esc(a.subject)}</div></div>` : `<div class="act" data-act="${esc(a.id)}"><b>✉️ Email menunggu konfirmasi</b><div class="meta">Ke: ${esc(a.to)}<br>Subjek: ${esc(a.subject)}${a.attachment ? `<br>Lampiran: ${esc(a.attachment)}` : ''}</div>
    <details><summary>Lihat isi</summary><pre>${esc(a.body)}</pre></details><div class="actions"><button class="btn primary" data-do="confirm">Kirim email</button><button class="btn" data-do="cancel">Batal</button></div></div>`).join('');
  const used = (meta.used || []).length ? `<div class="src">🛠️ ${meta.used.join(', ')}</div>` : '';
  return `${files ? `<div class="actions" style="margin-top:8px">${files}</div>` : ''}${acts}${used}`;
}
const PROMPTS = ['Buatkan PDF CV 1 halaman untuk peluang teratas', 'Ingatkan saya di WhatsApp untuk follow-up besok', '3 peluang mana yang harus saya kejar dulu minggu ini, dan kenapa?', 'Lamaran mana yang perlu di-follow-up? Tuliskan pesannya.', 'Bantu saya siapkan jawaban interview untuk peluang teratas.', 'Tulis posting LinkedIn tentang pengalaman PPIC Smart Planner (tanpa data rahasia).', 'Berapa harga yang pantas untuk proyek aplikasi inventory gudang 6 minggu?'];
async function chat() {
  const hist = await api('assistant');
  $('#list').innerHTML = `<div class="card chatbox"><div id="log" class="log">${hist.length ? '' : `<div class="msg a">Halo Efrino 👋 Saya tahu profil Anda, peluang terbaik, shortlist, lamaran terkirim, dan leads jasa. Mau mulai dari mana?</div>`}</div>
    <div class="chips" id="qp">${PROMPTS.map(q => `<button type="button" class="qp">${esc(q)}</button>`).join('')}</div>
    <form id="cf" class="cform"><textarea id="ct" rows="2" placeholder="Tanya apa saja… (Enter kirim, Shift+Enter baris baru). Sebut #id untuk peluang tertentu."></textarea><button class="btn primary">Kirim</button></form>
    <div class="actions"><button class="btn" id="creset" type="button">Mulai percakapan baru</button></div></div>`;
  const log = $('#log');
  const add = (role, text, meta) => { const d = document.createElement('div'); d.className = `msg ${role === 'user' ? 'u' : 'a'}`; d.innerHTML = role === 'user' ? esc(text).replace(/\n/g, '<br>') : md(text) + metaHtml(meta);
    if (role !== 'user') { const c = document.createElement('button'); c.className = 'copy'; c.textContent = 'Salin'; c.onclick = () => { navigator.clipboard.writeText(text); toast('Disalin'); }; d.append(c); }
    log.append(d); log.scrollTop = log.scrollHeight; return d; };
  hist.forEach(m => add(m.role, m.content, m.meta));
  log.addEventListener('click', async e => {
    const d = e.target.closest('[data-do]');
    if (d) { const box = d.closest('[data-act]'); d.disabled = true;
      try { await api(`actions/${box.dataset.act}/${d.dataset.do}`, { method: 'POST' }); box.innerHTML = d.dataset.do === 'confirm' ? '<b>✅ Email terkirim</b>' : '<b>Dibatalkan</b>'; }
      catch (err) { toast(err.message); d.disabled = false; } return; }
    const a = e.target.closest('[data-item]'); if (!a) return; e.preventDefault(); const it = await api(`items/${a.dataset.item}`).catch(() => null); if (it?.url) window.open(it.url, '_blank', 'noopener'); else toast('Peluang tidak ditemukan'); });
  const send = async text => {
    if (!text.trim()) return;
    add('user', text); $('#ct').value = '';
    const w = add('assistant', '…'); w.classList.add('typing');
    try { const r = await api('assistant', { method: 'POST', body: { message: text } }); w.remove(); add('assistant', r.reply, r.meta); }
    catch (e) { w.remove(); toast(e.message); }
  };
  $('#cf').onsubmit = e => { e.preventDefault(); send($('#ct').value); };
  $('#ct').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send($('#ct').value); } };
  document.querySelectorAll('.qp').forEach(b => b.onclick = () => send(b.textContent));
  $('#creset').onclick = async () => { await api('assistant', { method: 'DELETE' }); chat(); };
  $('#ct').focus();
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
