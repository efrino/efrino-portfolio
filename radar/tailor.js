// Tailored resume + cover letter for one job description, rendered as downloadable PDFs.
import { db } from './db.js';
import { chatRaw, profile } from './engine.js';
import { makePdf, makeDocx } from './tools.js';

const CONTACT = 'efrinowep@gmail.com · WhatsApp 0851-8408-4989 · efrino.web.id · github.com/efrino';
const slug = s => String(s || '').replace(/[^\w ]+/g, ' ').trim().split(/\s+/).slice(0, 4).join('-') || 'Lowongan';

export async function tailor({ jd = '', itemId = null, lang = 'auto' } = {}) {
  const item = itemId ? db.prepare('SELECT * FROM items WHERE id = ?').get(Number(itemId)) : null;
  const job = [item && `${item.title} · ${item.company || ''} · ${item.location || ''}`, item?.description, jd].filter(Boolean).join('\n\n').slice(0, 12000);
  if (job.trim().length < 80) throw new Error('Tempel job description yang lebih lengkap (minimal beberapa kalimat).');
  const p = profile();
  const req = {
    max_tokens: 8000, temperature: 0.25,
    messages: [
      { role: 'system', content: `Kamu career coach & penulis CV ATS. Susun CV dan cover letter Efrino yang DISESUAIKAN dengan job description.
ATURAN FAKTA: pakai HANYA fakta di PROFIL. Boleh memilih, mengurutkan, dan menyusun ulang kalimat agar memakai kata kunci JD, tapi DILARANG menambah teknologi, angka, gelar, sertifikat, perusahaan, atau pengalaman yang tidak ada di PROFIL. Kata kunci JD yang tidak didukung PROFIL masukkan ke "gaps", bukan ke CV.
Jangan sebut nama perusahaan tempat Efrino bekerja saat ini maupun nama proyek internalnya; tulis "perusahaan manufaktur otomotif" / "sistem perencanaan produksi". Proyek internal kantor (PPIC Smart Planner, My Armada, Scan GR, rest_maj1, dan apa pun yang dibuat untuk perusahaan itu) TIDAK BOLEH disebut namanya dan TIDAK masuk "Proyek Pilihan"; cukup dijelaskan umum sebagai poin di bawah Pengalaman. "Proyek Pilihan" hanya proyek pribadi/publik (mis. Opnamo, Balasin, Radar, efrino.web.id tools, Nayea, dll. sesuai PROFIL).
Bahasa: ${lang === 'en' ? 'English' : lang === 'id' ? 'Bahasa Indonesia' : 'ikuti bahasa job description'}.
Format markdown sederhana untuk PDF: # judul, ## bagian, ### sub, - poin, **tebal**. Tanpa tabel, tanpa tautan markdown.
CV (maks 1 halaman): baris 1 "# Efrino Wahyu Eko Pambudi", baris 2 posisi yang dituju, baris 3 "${CONTACT}", lalu ## Ringkasan (3 kalimat), ## Keahlian Utama (selaras JD), ## Pengalaman, ## Proyek Pilihan (2–4 paling relevan), ## Pendidikan bila ada di PROFIL. Judul bagian ikut bahasa.
Cover letter: 3–4 paragraf pendek, sapaan ke tim rekrutmen perusahaan (bila diketahui), hubungkan 2–3 kebutuhan JD dengan bukti dari PROFIL, penutup dengan ajakan interview, tanda tangan nama + kontak.
Balas PERSIS dalam 3 bagian dengan penanda ini (tanpa code fence):
===META===
{"role":"posisi","company":"perusahaan atau ''","lang":"id|en","match":0-100,"keywords_hit":["..."],"gaps":["..."],"tips":["2–4 saran singkat"]}
===RESUME===
(CV markdown)
===COVER===
(cover letter markdown)` },
      { role: 'user', content: `PROFIL:\n${p.about}\n\nJOB DESCRIPTION:\n${job}` },
    ],
  };
  // The fallback model occasionally breaks the format; one silent retry before giving up.
  let r;
  for (let i = 0; i < 2 && !r; i++) r = parse(String((await chatRaw(req)).content || ''));
  if (!r) throw new Error('AI sedang sibuk dan jawabannya terpotong. Coba tekan lagi sebentar.');
  const tag = slug(r.company || r.role);
  const en = r.lang === 'en';
  const cv = { title: `CV Efrino - ${r.role || ''}`, filename: `CV-Efrino-${tag}`, content: r.resume_md };
  const cl = { title: `Cover Letter - ${r.role || ''}`, filename: `${en ? 'Cover-Letter' : 'Surat-Lamaran'}-Efrino-${tag}`, content: r.cover_md };
  const files = [await makePdf(cv), await makePdf(cl)];
  const docx = [await makeDocx(cv), await makeDocx(cl)];
  if (item) db.prepare("UPDATE items SET status = CASE WHEN status = 'new' THEN 'shortlist' ELSE status END WHERE id = ?").run(item.id);
  return { role: r.role, company: r.company, match: Math.max(0, Math.min(100, Number(r.match) || 0)), keywords_hit: (r.keywords_hit || []).slice(0, 12), gaps: (r.gaps || []).slice(0, 8), tips: (r.tips || []).slice(0, 4), cover_text: r.cover_md, files, docx };
}

export const recentFiles = (n = 12) => db.prepare('SELECT id, name, at FROM files ORDER BY at DESC, rowid DESC LIMIT ?').all(n).map(f => ({ ...f, url: `/api/files/${f.id}` }));

// Markdown documents travel outside JSON (models often break escaping inside long JSON strings).
export function parse(text) {
  const t = text.replace(/^```\w*\n?|```\s*$/gm, '');
  const part = k => t.split(new RegExp(`^\\s*={2,}\\s*${k}\\s*={2,}\\s*$`, 'mi'))[1]?.split(/^\s*={2,}\s*[A-Z]+\s*={2,}\s*$/m)[0]?.trim();
  const resume_md = part('RESUME'), cover_md = part('COVER');
  if (!resume_md || resume_md.length < 200 || !cover_md || cover_md.length < 200) return null;
  let meta = {}; const m = (part('META') || '').match(/\{[\s\S]*\}/);
  try { meta = m ? JSON.parse(m[0]) : {}; } catch {}
  return { ...meta, resume_md, cover_md };
}
