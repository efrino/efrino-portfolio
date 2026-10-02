import { toast } from './jasa.js';
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const list = document.getElementById('list'), tok = document.getElementById('tok');
async function load(token) {
  const r = await fetch('/api/leads', { headers: { 'x-leads-token': token } });
  if (!r.ok) { sessionStorage.removeItem('lt'); return toast('Token salah.', true); }
  sessionStorage.setItem('lt', token);
  const leads = await r.json();
  const wa = n => n ? `https://wa.me/${n.replace(/^0/, '62').replace(/^\+/, '')}` : null;
  list.innerHTML = leads.length ? leads.map(l => `<div class="box lead-card">
    <div class="row" style="justify-content:space-between"><b style="font-size:18px">${esc(l.name)}${l.company ? ` · <span class="muted">${esc(l.company)}</span>` : ''}</b><span class="meta">${new Date(l.at).toLocaleString('id-ID')}</span></div>
    <div class="meta">${l.whatsapp ? `WA <a class="grad" href="${wa(l.whatsapp)}" target="_blank" rel="noopener">${esc(l.whatsapp)}</a> · ` : ''}${l.email ? `<a class="grad" href="mailto:${esc(l.email)}">${esc(l.email)}</a> · ` : ''}budget ${esc(l.budget || '–')} · sumber ${esc(l.source || '–')}</div>
    <p>${esc(l.need)}</p></div>`).join('') : '<div class="box muted">Belum ada lead.</div>';
}
document.getElementById('auth').onsubmit = e => { e.preventDefault(); load(tok.value.trim()); };
const saved = sessionStorage.getItem('lt'); if (saved) load(saved);
