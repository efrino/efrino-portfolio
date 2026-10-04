// Tailored resume + cover letter for one job description, rendered as downloadable PDFs.
import { db } from './db.js';
import { chatRaw, profile } from './engine.js';
import { makePdf } from './tools.js';

const CONTACT = 'efrinowep@gmail.com · WhatsApp 0851-8408-4989 · efrino.web.id · github.com/efrino';
const slug = s => String(s || '').replace(/[^\w ]+/g, ' ').trim().split(/\s+/).slice(0, 4).join('-') || 'Lowongan';

export async function tailor({ jd = '', itemId = null, lang = 'auto' } = {}) {
  const item = itemId ? db.prepare('SELECT * FROM items WHERE id = ?').get(Number(itemId)) : null;
  const job = [item && `${item.title} · ${item.company || ''} · ${item.location || ''}`, item?.description, jd].filter(Boolean).join('\n\n').slice(0, 12000);
  if (job.trim().length < 80) throw new Error('Tempel job description yang lebih lengkap (minimal beberapa kalimat).');
  const p = profile();
  const msg = await chatRaw({
    max_tokens: 4000, temperature: 0.25, response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `Kamu career coach & penulis CV ATS. Susun CV dan cover letter Efrino yang DISESUAIKAN dengan job description.
ATURAN FAKTA: pakai HANYA fakta di PROFIL. Boleh memilih, mengurutkan, dan menyusun ulang kalimat agar memakai kata kunci JD, tapi DILARANG menambah teknologi, angka, gelar, sertifikat, perusahaan, atau pengalaman yang tidak ada di PROFIL. Kata kunci JD yang tidak didukung PROFIL masukkan ke "gaps", bukan ke CV.
Jangan sebut nama perusahaan tempat Efrino bekerja saat ini maupun nama proyek internalnya; tulis "perusahaan manufaktur otomotif" / "sistem perencanaan produksi".
Bahasa: ${lang === 'en' ? 'English' : lang === 'id' ? 'Bahasa Indonesia' : 'ikuti bahasa job description'}.
Format markdown sederhana untuk PDF: # judul, ## bagian, ### sub, - poin, **tebal**. Tanpa tabel, tanpa tautan markdown.
CV (maks 1 halaman): baris 1 "# Efrino Wahyu Eko Pambudi", baris 2 posisi yang dituju, baris 3 "${CONTACT}", lalu ## Ringkasan (3 kalimat), ## Keahlian Utama (selaras JD), ## Pengalaman, ## Proyek Pilihan (2–4 paling relevan), ## Pendidikan bila ada di PROFIL. Judul bagian ikut bahasa.
Cover letter: 3–4 paragraf pendek, sapaan ke tim rekrutmen perusahaan (bila diketahui), hubungkan 2–3 kebutuhan JD dengan bukti dari PROFIL, penutup dengan ajakan interview, tanda tangan nama + kontak.
Balas JSON: {"role":"posisi","company":"perusahaan atau ''","lang":"id|en","match":0-100,"keywords_hit":["..."],"gaps":["..."],"tips":["2–4 saran singkat untuk melamar"],"resume_md":"...","cover_md":"..."}` },
      { role: 'user', content: `PROFIL:\n${p.about}\n\nJOB DESCRIPTION:\n${job}` },
    ],
  });
  let r; try { r = JSON.parse(String(msg.content).replace(/^```(json)?|```$/g, '').trim()); } catch { throw new Error('AI mengembalikan format tidak valid. Coba lagi.'); }
  if (!r.resume_md || !r.cover_md) throw new Error('AI belum menghasilkan dokumen lengkap. Coba lagi.');
  const tag = slug(r.company || r.role);
  const en = r.lang === 'en';
  const files = [
    await makePdf({ title: `CV Efrino - ${r.role || ''}`, filename: `CV-Efrino-${tag}`, content: r.resume_md }),
    await makePdf({ title: `Cover Letter - ${r.role || ''}`, filename: `${en ? 'Cover-Letter' : 'Surat-Lamaran'}-Efrino-${tag}`, content: r.cover_md }),
  ];
  if (item) db.prepare("UPDATE items SET status = CASE WHEN status = 'new' THEN 'shortlist' ELSE status END WHERE id = ?").run(item.id);
  return { role: r.role, company: r.company, match: Math.max(0, Math.min(100, Number(r.match) || 0)), keywords_hit: (r.keywords_hit || []).slice(0, 12), gaps: (r.gaps || []).slice(0, 8), tips: (r.tips || []).slice(0, 4), cover_text: r.cover_md, files };
}

export const recentFiles = (n = 8) => db.prepare('SELECT id, name, at FROM files ORDER BY at DESC, rowid DESC LIMIT ?').all(n).map(f => ({ ...f, url: `/api/files/${f.id}` }));
