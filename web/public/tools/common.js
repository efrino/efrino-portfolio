// Shared helpers for every tool page: header/footer, dropzone, toast, downloads.
export const TOOLS = [
  { slug: 'bg-remover', emoji: '🪄', name: 'Background Remover', desc: 'Hapus background foto otomatis dengan AI, langsung di browser. Ekspor PNG transparan atau ganti warna latar.', tag: 'AI · WebGPU/WASM' },
  { slug: '3d-maker', emoji: '🧊', name: '3D Maker', desc: 'Ubah teks atau logo SVG jadi model 3D dengan bevel & material. Ekspor GLB untuk web/AR atau STL untuk 3D print.', tag: 'Three.js · GLB · STL' },
  { slug: 'compress', emoji: '🗜️', name: 'Image Compressor', desc: 'Kompres & konversi banyak gambar sekaligus ke WebP, JPEG, atau PNG. Atur kualitas dan ukuran maksimal.', tag: 'Batch · WebP · JPEG' },
  { slug: 'pdf-merge', emoji: '📑', name: 'PDF Merge', desc: 'Gabungkan banyak PDF & foto jadi satu file. Atur urutan dan pilih halaman. Cocok untuk berkas lamaran & administrasi.', tag: 'PDF · JPG · PNG' },
  { slug: 'qr', emoji: '🔳', name: 'QR Generator', desc: 'Buat QR code untuk link, Wi-Fi, atau teks. Warna kustom, logo di tengah, ekspor PNG & SVG.', tag: 'PNG · SVG · Wi-Fi' },
];

// Link to the same tool in the other language (English lives under /en/).
function langSwitch() {
  const en = document.documentElement.lang === 'en', p = location.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  return `<a href="${en ? p : '/en' + (p === '/' ? '/' : p)}" class="lang-sw" title="${en ? 'Bahasa Indonesia' : 'English'}">${en ? '🇮🇩 ID' : '🇬🇧 EN'}</a>`;
}

export function shell(active) {
  const top = document.createElement('header');
  top.className = 't-top';
  top.innerHTML = `
    <a class="brand" href="/"><span>efrino<span class="grad">.</span>tools</span><small>· free, private, in-browser</small></a>
    <nav>${active ? '<a href="/">← All tools</a>' : ''}<a href="https://efrino.web.id">Portfolio ↗</a>${langSwitch()}</nav>`;
  document.body.prepend(top);
  const foot = document.createElement('footer');
  foot.className = 't-foot';
  foot.innerHTML = `Dibuat oleh <a href="https://efrino.web.id">Efrino Wahyu Eko Pambudi</a> · Semua proses berjalan di perangkat Anda: file tidak pernah di-upload. · <a href="https://github.com/efrino/efrino-portfolio">source</a>`;
  document.body.append(foot);
  const t = document.createElement('div'); t.className = 'toast'; t.id = 'toast'; document.body.append(t);
}

let toastTimer;
export function toast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast show${err ? ' err' : ''}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = 'toast', 3200);
}

export const fmtBytes = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const baseName = f => f.name.replace(/\.[^.]+$/, '');

// Dropzone that accepts click, drag & drop, and paste (Ctrl+V).
export function dropzone(el, { accept = 'image/*', multiple = false, maxMB = 25, onFiles }) {
  const input = el.querySelector('input[type=file]');
  input.accept = accept; input.multiple = multiple;
  const ok = f => {
    const typeOk = accept.split(',').some(a => a.trim().endsWith('/*') ? f.type.startsWith(a.trim().slice(0, -1)) : f.type === a.trim() || f.name.toLowerCase().endsWith(a.trim()));
    if (!typeOk) { toast(`Format ${f.name} tidak didukung.`, true); return false; }
    if (f.size > maxMB * 1048576) { toast(`${f.name} lebih dari ${maxMB} MB.`, true); return false; }
    return true;
  };
  const take = list => { const files = [...list].filter(ok); if (files.length) onFiles(multiple ? files : [files[0]]); };
  el.addEventListener('click', () => input.click());
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', () => { take(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.remove('over'); }));
  el.addEventListener('drop', e => take(e.dataTransfer.files));
  addEventListener('paste', e => { const f = [...e.clipboardData.items].filter(i => i.kind === 'file').map(i => i.getAsFile()); if (f.length) take(f); });
}

export function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Gambar tidak bisa dibaca.')); i.src = src; });
}

export const canvasToBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
