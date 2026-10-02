// EN/ID switch: Indonesian lives in the HTML; English comes from i18n-dict.js. Choice is remembered.
import { EN } from './i18n-dict.js';

export function initialLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'id') return q;
  try { const saved = localStorage.getItem('lang'); if (saved === 'en' || saved === 'id') return saved; } catch {}
  return (navigator.languages || [navigator.language]).some(l => /^id|^ms/i.test(l)) ? 'id' : 'en';
}

export function applyStatic(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.dataset.orig === undefined) el.dataset.orig = el.innerHTML;
    el.innerHTML = lang === 'en' ? EN[el.dataset.i18n] ?? el.dataset.orig : el.dataset.orig;
  });
  // English visitors go to the English edition of the tools site.
  document.querySelectorAll('a[href^="https://tools.efrino.web.id"]').forEach(a => { a.href = lang === 'en' ? 'https://tools.efrino.web.id/en/' : 'https://tools.efrino.web.id'; });
  const b = document.getElementById('lang');
  if (b) { b.textContent = lang === 'en' ? 'ID' : 'EN'; b.title = lang === 'en' ? 'Bahasa Indonesia' : 'English'; }
  try { localStorage.setItem('lang', lang); } catch {}
}
