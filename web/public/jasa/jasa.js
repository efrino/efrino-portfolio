let tt;
export function toast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast2 show${err ? ' err' : ''}`;
  clearTimeout(tt); tt = setTimeout(() => (t.className = 'toast2'), 3500);
}

const form = document.getElementById('lead');
form?.addEventListener('submit', async e => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(form));
  body.source = new URLSearchParams(location.search).get('from') || (document.referrer.includes('/demo') ? 'demo' : 'landing');
  if (!body.name.trim() || !(body.whatsapp.trim() || body.email.trim()) || body.need.trim().length < 10) {
    return toast('Isi nama, WhatsApp atau email, dan ceritakan kebutuhan Anda.', true);
  }
  const btn = form.querySelector('button'); btn.disabled = true;
  try {
    const r = await fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Gagal mengirim.');
    form.outerHTML = `<div class="box ok-box"><div style="font-size:44px">✅</div><h3 style="font-size:22px;margin:8px 0">Terima kasih, ${body.name.replace(/[<>&]/g, '')}!</h3><p class="muted">Pesan Anda sudah saya terima. Saya akan menghubungi Anda dalam 1×24 jam kerja.</p></div>`;
  } catch (err) { toast(err.message, true); btn.disabled = false; }
});

// Prefill the need field when coming back from the demo with a file name.
const pre = new URLSearchParams(location.search).get('file');
if (pre && form) form.need.value = `Saya mencoba demo dengan file "${pre}". Ingin dibuatkan aplikasi lengkapnya untuk proses ini: `;
