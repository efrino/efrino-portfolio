// "Excel -> web app" demo: everything runs client-side with SheetJS.
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
let tt; const toast = (m, err) => { const t = $('toast'); t.textContent = m; t.className = `toast2 show${err ? ' err' : ''}`; clearTimeout(tt); tt = setTimeout(() => (t.className = 'toast2'), 3200); };

let wb = null, fileName = '', cols = [], rows = [], view = 'dash', state = { q: '', filter: '', sort: null, dir: 1, page: 0 };

// ---------- sample data ----------
const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
const pick = a => a[rnd(0, a.length - 1)];
const day = i => { const d = new Date(); d.setDate(d.getDate() - i); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const SAMPLES = {
  produksi: () => Array.from({ length: 180 }, (_, i) => { const plan = rnd(300, 900); const act = Math.round(plan * (0.78 + Math.random() * 0.27));
    return { Tanggal: day(Math.floor(i / 6)), Shift: pick(['1', '2', '3']), Line: pick(['Welding A', 'Welding B', 'Press 1', 'Painting']), 'Part No': pick(['BRK-A12', 'FRM-220', 'STY-010', 'CVR-301', 'BKT-115']), Plan: plan, Aktual: act, NG: rnd(0, 18), Operator: pick(['Andi', 'Budi', 'Citra', 'Dewi', 'Eko']) }; }),
  stok: () => ['Semen 50kg', 'Besi 10mm', 'Besi 8mm', 'Cat Tembok 5kg', 'Pipa PVC 1/2', 'Keramik 40x40', 'Paku 5cm', 'Triplek 9mm', 'Genteng Metal', 'Lem PVC', 'Kawat Bendrat', 'Pasir (m3)'].flatMap((n, i) =>
    ['Gudang Utama', 'Gudang Belakang'].map(g => ({ SKU: `BRG-${String(i + 1).padStart(3, '0')}`, 'Nama Barang': n, Gudang: g, Kategori: pick(['Material', 'Finishing', 'Plumbing']), Stok: rnd(0, 400), 'Stok Minimum': 50, 'Harga Beli': rnd(10, 150) * 1000 }))),
  penjualan: () => Array.from({ length: 240 }, (_, i) => { const q = rnd(1, 12), h = pick([15000, 22000, 35000, 48000, 75000]);
    return { Tanggal: day(Math.floor(i / 8)), Invoice: `INV-${10000 + i}`, Produk: pick(['Kopi Susu', 'Americano', 'Matcha Latte', 'Croissant', 'Roti Bakar', 'Teh Tarik']), Kanal: pick(['Kasir', 'GoFood', 'GrabFood', 'ShopeeFood']), Qty: q, Harga: h, Total: q * h }; }),
};

// ---------- load & type detection ----------
function loadWorkbook(book, name) {
  wb = book; fileName = name;
  const sel = $('sheet');
  sel.innerHTML = wb.SheetNames.map(n => `<option>${esc(n)}</option>`).join('');
  sel.classList.toggle('hidden', wb.SheetNames.length < 2);
  // Pick the sheet with the most rows by default.
  const best = wb.SheetNames.reduce((a, n) => (sheetRows(n).length > sheetRows(a).length ? n : a), wb.SheetNames[0]);
  sel.value = best; useSheet(best);
}
const sheetRows = n => XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null, raw: true });

function useSheet(name) {
  const data = sheetRows(name).filter(r => Object.values(r).some(v => v !== null && v !== ''));
  if (!data.length) return toast('Sheet ini kosong. Pastikan baris pertama berisi judul kolom.', true);
  const keys = [...new Set(data.slice(0, 500).flatMap(Object.keys))].filter(k => !/^__EMPTY/.test(k)).slice(0, 30);
  rows = data.slice(0, 20000).map(r => Object.fromEntries(keys.map(k => [k, r[k]])));
  cols = keys.map(k => ({ key: k, type: detect(rows.map(r => r[k]), k) }));
  rows.forEach(r => cols.forEach(c => { if (c.type === 'date') r[c.key] = toDate(r[c.key]); if (c.type === 'number') r[c.key] = toNum(r[c.key]); }));
  state = { q: '', filter: '', sort: null, dir: 1, page: 0 };
  $('start').classList.add('hidden'); $('result').classList.remove('hidden');
  $('appName').textContent = fileName.replace(/\.[^.]+$/, '');
  $('types').innerHTML = cols.map(c => `<span>${esc(c.key)} · ${{ number: '🔢 angka', date: '📅 tanggal', category: '🏷️ kategori', text: '🔤 teks' }[c.type]}</span>`).join('');
  $('consult').href = `/?file=${encodeURIComponent(fileName)}#konsultasi`;
  show('dash');
  toast(`✓ ${rows.length} baris · ${cols.length} kolom dikenali`);
}

const toNum = v => (typeof v === 'number' ? v : v === null || v === '' ? null : Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || (String(v).trim() === '0' ? 0 : null));
function toDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'number' && v > 20000 && v < 80000) { const d = XLSX.SSF.parse_date_code(v); return new Date(d.y, d.m - 1, d.d); }
  if (typeof v === 'string') { const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/); if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], m[2] - 1, m[1]); const t = Date.parse(v); if (!Number.isNaN(t)) return new Date(t); }
  return null;
}
const DATE_HINT = /tanggal|tgl|date|waktu|periode|due|jatuh tempo/i;
const CODE_HINT = /^(shift|kode|code|id|no\.?|nomor|tahun|bulan|minggu|week|line|kelas|grade|level)\b/i;
function detect(vals, key) {
  const v = vals.filter(x => x !== null && x !== '');
  if (!v.length) return 'text';
  const share = f => v.filter(f).length / v.length;
  if (share(x => x instanceof Date) > 0.8 || share(x => typeof x === 'string' && /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(x.trim())) > 0.8) return 'date';
  // Excel stores dates as serial numbers (~1990–2100); trust the header to tell them apart.
  if (DATE_HINT.test(key) && share(x => typeof x === 'number' && x > 30000 && x < 75000) > 0.8) return 'date';
  if (share(x => typeof x === 'number' || /^-?[\d.,]+$/.test(String(x).trim())) > 0.85) {
    // Numeric codes (shift 1/2/3, kode 101) are categories only when the header says so.
    return CODE_HINT.test(key) && new Set(v.map(String)).size <= 40 ? 'category' : 'number';
  }
  const distinct = new Set(v.map(String)).size;
  return distinct <= Math.max(12, v.length * 0.2) && distinct < 60 ? 'category' : 'text';
}

// ---------- views ----------
const fmt = (c, v) => v === null || v === undefined ? '' : c.type === 'number' ? nf.format(v) : c.type === 'date' ? (v instanceof Date ? v.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '') : String(v);
const nums = () => cols.filter(c => c.type === 'number');
const cats = () => cols.filter(c => c.type === 'category');
const dateCol = () => cols.find(c => c.type === 'date');

function show(v) {
  if (v === 'export') return exportXlsx();
  if (v === 'add') return editRow(null);
  view = v;
  document.querySelectorAll('.app2 aside button').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  $('body').innerHTML = v === 'dash' ? dashboard() : table();
  if (v === 'data') bindTable();
}

function dashboard() {
  const n = nums(), c = cats(), d = dateCol();
  const sum = k => rows.reduce((a, r) => a + (r[k] || 0), 0);
  const kpis = [`<div class="kpi"><b>${nf.format(rows.length)}</b><span>Total baris data</span></div>`,
    ...n.slice(0, 3).map(col => `<div class="kpi"><b>${compact.format(sum(col.key))}</b><span>Total ${esc(col.key)}</span></div>`)];
  if (n.length >= 2) { // e.g. Aktual / Plan -> achievement
    const [a, b] = [n.find(x => /aktual|actual|real/i.test(x.key)), n.find(x => /plan|target/i.test(x.key))];
    if (a && b && sum(b.key)) kpis.push(`<div class="kpi"><b>${nf.format(sum(a.key) / sum(b.key) * 100)}%</b><span>Pencapaian ${esc(a.key)} / ${esc(b.key)}</span></div>`);
  }
  if (c[0]) kpis.push(`<div class="kpi"><b>${new Set(rows.map(r => r[c[0].key])).size}</b><span>${esc(c[0].key)} berbeda</span></div>`);
  let charts = '';
  const metric = n.find(x => /total|aktual|actual|qty|stok|jumlah|nilai/i.test(x.key)) || n[0];
  if (c[0]) charts += barChart(c[0], metric);
  if (d) charts += lineChart(d, metric);
  if (c[1] && charts.split('<svg').length < 3) charts += barChart(c[1], metric);
  return `<div class="kpis">${kpis.slice(0, 5).join('')}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px">${charts || '<div class="chart muted">Tambahkan kolom kategori atau tanggal untuk grafik otomatis.</div>'}</div>`;
}

function group(by, metric, keyFn = r => r[by.key]) {
  const m = new Map();
  for (const r of rows) { const k = keyFn(r); if (k === null || k === undefined || k === '') continue; m.set(k, (m.get(k) || 0) + (metric ? r[metric.key] || 0 : 1)); }
  return m;
}
function barChart(cat, metric) {
  const data = [...group(cat, metric)].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(...data.map(d => d[1]), 1), W = 520, rowH = 30, H = data.length * rowH + 10;
  return `<div class="chart"><h4>${metric ? `${esc(metric.key)} per ${esc(cat.key)}` : `Jumlah baris per ${esc(cat.key)}`}</h4>
    <svg viewBox="0 0 ${W} ${H}" role="img">${data.map(([k, v], i) => { const w = (v / max) * (W - 220);
      return `<text x="0" y="${i * rowH + 20}" fill="#8b90a5" font-size="12">${esc(String(k).slice(0, 18))}</text>
        <rect x="130" y="${i * rowH + 7}" width="${Math.max(w, 2)}" height="18" rx="5" fill="url(#g${cat.key.length})"><animate attributeName="width" from="0" to="${Math.max(w, 2)}" dur=".7s" fill="freeze"/></rect>
        <text x="${136 + w}" y="${i * rowH + 20}" fill="#e8eaf2" font-size="12">${compact.format(v)}</text>`; }).join('')}
      <defs><linearGradient id="g${cat.key.length}"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs></svg></div>`;
}
function lineChart(dc, metric) {
  const data = [...group(dc, metric, r => (r[dc.key] instanceof Date ? r[dc.key].toISOString().slice(0, 10) : null))].sort((a, b) => a[0].localeCompare(b[0])).slice(-60);
  if (data.length < 2) return '';
  const W = 520, H = 180, max = Math.max(...data.map(d => d[1]), 1), x = i => 30 + (i / (data.length - 1)) * (W - 40), y = v => H - 24 - (v / max) * (H - 44);
  const pts = data.map((d, i) => `${x(i)},${y(d[1])}`).join(' ');
  const lab = i => new Date(data[i][0]).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  return `<div class="chart"><h4>${metric ? `${esc(metric.key)} per hari` : 'Jumlah baris per hari'}</h4>
    <svg viewBox="0 0 ${W} ${H}" role="img"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c5cff" stop-opacity=".45"/><stop offset="1" stop-color="#7c5cff" stop-opacity="0"/></linearGradient></defs>
      <polygon points="30,${H - 24} ${pts} ${x(data.length - 1)},${H - 24}" fill="url(#lg)"/>
      <polyline points="${pts}" fill="none" stroke="#22d3ee" stroke-width="2.5" stroke-linejoin="round"/>
      <text x="30" y="${H - 6}" fill="#8b90a5" font-size="11">${lab(0)}</text><text x="${W - 10}" y="${H - 6}" fill="#8b90a5" font-size="11" text-anchor="end">${lab(data.length - 1)}</text>
      <text x="30" y="14" fill="#8b90a5" font-size="11">maks ${compact.format(max)}</text></svg></div>`;
}

function filtered() {
  const q = state.q.toLowerCase(), fc = cats()[0];
  let out = rows.filter(r => (!q || cols.some(c => String(fmt(c, r[c.key])).toLowerCase().includes(q))) && (!state.filter || String(r[fc.key]) === state.filter));
  if (state.sort) { const c = cols.find(x => x.key === state.sort); out = [...out].sort((a, b) => { const va = a[c.key], vb = b[c.key]; return (va === null) - (vb === null) || (va > vb ? 1 : va < vb ? -1 : 0) * state.dir; }); }
  return out;
}
function table() {
  const fc = cats()[0], list = filtered(), per = 25, pages = Math.max(1, Math.ceil(list.length / per));
  state.page = Math.min(state.page, pages - 1);
  const slice = list.slice(state.page * per, state.page * per + per);
  return `<div class="tools"><input id="q" placeholder="Cari di semua kolom…" value="${esc(state.q)}" style="flex:1;min-width:180px">
      ${fc ? `<select id="flt"><option value="">Semua ${esc(fc.key)}</option>${[...new Set(rows.map(r => r[fc.key]))].filter(v => v !== null).sort().map(v => `<option ${String(v) === state.filter ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>` : ''}</div>
    <div class="tbl"><table><thead><tr>${cols.map(c => `<th data-k="${esc(c.key)}">${esc(c.key)} ${state.sort === c.key ? `<small>${state.dir > 0 ? '▲' : '▼'}</small>` : ''}</th>`).join('')}</tr></thead>
    <tbody>${slice.map(r => `<tr data-i="${rows.indexOf(r)}">${cols.map(c => `<td class="${c.type === 'number' ? 'n' : ''}">${esc(fmt(c, r[c.key]))}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}" class="muted">Tidak ada data yang cocok.</td></tr>`}</tbody></table></div>
    <div class="pager"><span>${nf.format(list.length)} baris · klik judul kolom untuk mengurutkan, klik baris untuk mengubah</span>
      <span><button class="btn sm" id="prev" ${state.page ? '' : 'disabled'}>‹</button> ${state.page + 1}/${pages} <button class="btn sm" id="next" ${state.page < pages - 1 ? '' : 'disabled'}>›</button></span></div>`;
}
function bindTable() {
  const re = () => { $('body').innerHTML = table(); bindTable(); };
  $('q').oninput = e => { state.q = e.target.value; state.page = 0; const pos = e.target.selectionStart; re(); $('q').focus(); $('q').setSelectionRange(pos, pos); };
  if ($('flt')) $('flt').onchange = e => { state.filter = e.target.value; state.page = 0; re(); };
  document.querySelectorAll('.tbl th').forEach(th => th.onclick = () => { state.dir = state.sort === th.dataset.k ? -state.dir : 1; state.sort = th.dataset.k; re(); });
  document.querySelectorAll('.tbl tbody tr[data-i]').forEach(tr => tr.onclick = () => editRow(+tr.dataset.i));
  $('prev').onclick = () => { state.page--; re(); }; $('next').onclick = () => { state.page++; re(); };
}

// Auto-generated form from the detected column types.
function editRow(i) {
  const r = i === null ? {} : rows[i];
  const input = c => {
    const v = r[c.key];
    if (c.type === 'number') return `<input class="input" type="number" step="any" name="${esc(c.key)}" value="${v ?? ''}">`;
    if (c.type === 'date') return `<input class="input" type="date" name="${esc(c.key)}" value="${v instanceof Date ? new Date(v - v.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : ''}">`;
    if (c.type === 'category') return `<select class="input" name="${esc(c.key)}">${[...new Set(rows.map(x => x[c.key]))].filter(x => x !== null).sort().map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    return `<input class="input" name="${esc(c.key)}" value="${esc(v)}">`;
  };
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<form class="modal"><h3 style="font-size:19px">${i === null ? 'Tambah data' : 'Ubah data'}</h3>
    <p class="muted" style="font-size:13px">Form ini dibuat otomatis dari tipe kolom: angka, tanggal, dan pilihan kategori.</p>
    ${cols.map(c => `<label class="f"><span>${esc(c.key)}</span>${input(c)}</label>`).join('')}
    <div class="row" style="justify-content:space-between">${i === null ? '<span></span>' : '<button type="button" class="btn sm" id="delRow" style="color:#f87171">Hapus</button>'}
      <span class="row" style="gap:8px"><button type="button" class="btn sm" id="cx">Batal</button><button class="btn primary sm">Simpan</button></span></div></form>`;
  document.body.append(bg);
  bg.querySelectorAll('.input').forEach(el => Object.assign(el.style, { width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px', color: 'var(--text)', font: 'inherit' }));
  const close = () => bg.remove();
  bg.onclick = e => { if (e.target === bg || e.target.id === 'cx') close(); };
  bg.querySelector('#delRow')?.addEventListener('click', () => { rows.splice(i, 1); close(); show(view === 'dash' ? 'dash' : 'data'); toast('Baris dihapus'); });
  bg.querySelector('form').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target), nr = {};
    cols.forEach(c => { const v = fd.get(c.key); nr[c.key] = c.type === 'number' ? (v === '' ? null : +v) : c.type === 'date' ? (v ? new Date(v) : null) : v; });
    if (i === null) rows.unshift(nr); else rows[i] = nr;
    close(); show('data'); toast(i === null ? '✓ Data ditambahkan, dashboard ikut terbarui' : '✓ Tersimpan');
  };
}

function exportXlsx() {
  const ws = XLSX.utils.json_to_sheet(rows.map(r => Object.fromEntries(cols.map(c => [c.key, r[c.key]]))), { cellDates: true });
  const out = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(out, ws, 'Data');
  XLSX.writeFile(out, fileName.replace(/\.[^.]+$/, '') + '-webapp.xlsx');
  toast('✓ Diekspor ke Excel');
}

// ---------- input ----------
async function readFile(f) {
  if (f.size > 15 * 1048576) return toast('File lebih dari 15 MB.', true);
  try { loadWorkbook(XLSX.read(await f.arrayBuffer(), { cellDates: true }), f.name); }
  catch { toast('File tidak bisa dibaca. Pastikan formatnya .xlsx, .xls, atau .csv.', true); }
}
const drop = $('drop');
drop.onclick = () => $('file').click();
drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } };
$('file').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) readFile(f); };
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) readFile(f); });
document.querySelectorAll('[data-sample]').forEach(b => b.onclick = () => {
  const k = b.dataset.sample, book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(SAMPLES[k]()), 'Data');
  loadWorkbook(book, { produksi: 'Laporan Produksi Harian.xlsx', stok: 'Stok Gudang.xlsx', penjualan: 'Penjualan Toko.xlsx' }[k]);
});
document.querySelectorAll('.app2 aside button').forEach(b => b.onclick = () => show(b.dataset.v));
$('sheet').onchange = e => useSheet(e.target.value);
$('again').onclick = () => { $('result').classList.add('hidden'); $('start').classList.remove('hidden'); };
