// English edition of tools.efrino.web.id, served at /en/*. The Indonesian pages are the source;
// this table translates their HTML/JS on the fly so both stay in sync. Short labels are only
// replaced when they stand alone (between tags or quotes) so code is never touched.
const PAIRS = [
  // --- page titles & meta
  ['Hapus Background Foto Online Gratis, Tanpa Watermark | Efrino Tools', 'Remove Image Background Free Online, No Watermark | Efrino Tools'],
  ['Hapus background foto otomatis dengan AI, gratis dan tanpa watermark. Foto tidak di-upload: diproses langsung di browser. Cocok untuk foto produk &amp; pas foto.', 'Remove photo backgrounds automatically with AI: free, no watermark, no sign-up. Your photo is never uploaded; it is processed right in your browser. Great for product photos and headshots.'],
  ['Hapus background foto otomatis dengan AI, gratis dan tanpa watermark. Foto tidak di-upload: diproses langsung di browser. Cocok untuk foto produk & pas foto.', 'Remove photo backgrounds automatically with AI: free, no watermark, no sign-up. Your photo is never uploaded; it is processed right in your browser. Great for product photos and headshots.'],
  ['Background Remover AI: gratis & tanpa upload', 'AI Background Remover: free and upload-free'],
  ['Gabung PDF Online Gratis, Tanpa Upload | Efrino Tools', 'Merge PDF Files Online Free, No Upload | Efrino Tools'],
  ['Gabungkan banyak PDF dan foto JPG/PNG jadi satu PDF. Atur urutan dan pilih halaman. Gratis, tanpa upload, cocok untuk berkas lamaran kerja &amp; administrasi.', 'Combine multiple PDFs and JPG/PNG images into one PDF. Reorder files and pick pages. Free, no upload: perfect for job applications and paperwork.'],
  ['Gabungkan banyak PDF dan foto JPG/PNG jadi satu PDF. Atur urutan dan pilih halaman. Gratis, tanpa upload, cocok untuk berkas lamaran kerja & administrasi.', 'Combine multiple PDFs and JPG/PNG images into one PDF. Reorder files and pick pages. Free, no upload: perfect for job applications and paperwork.'],
  ['PDF Merge: gabung PDF tanpa upload', 'PDF Merge: combine PDFs without uploading'],
  ['Kompres Foto Online &amp; Ubah ke WebP/JPG Gratis | Efrino Tools', 'Compress Images Online & Convert to WebP/JPG Free | Efrino Tools'],
  ['Kompres Foto Online & Ubah ke WebP/JPG Gratis | Efrino Tools', 'Compress Images Online & Convert to WebP/JPG Free | Efrino Tools'],
  ['Kecilkan ukuran foto hingga di bawah 100 KB untuk CPNS, lamaran, atau website. Ubah JPG/PNG ke WebP, banyak file sekaligus, tanpa upload.', 'Shrink images under 100 KB for forms, job portals or websites. Convert JPG/PNG to WebP in batches, with no upload.'],
  ['Image Compressor: WebP, JPEG, PNG, tanpa upload', 'Image Compressor: WebP, JPEG, PNG, no upload'],
  ['Buat QR Code Gratis: Link, WiFi, WhatsApp, dengan Logo | Efrino Tools', 'Free QR Code Generator: Link, WiFi, WhatsApp, with Logo | Efrino Tools'],
  ['Buat QR code gratis tanpa kedaluwarsa untuk link, WiFi, WhatsApp, atau teks. Ganti warna, tambah logo, unduh PNG/SVG untuk menu, kartu nama, dan poster.', 'Create free QR codes that never expire for links, WiFi, WhatsApp or text. Custom colours, a logo in the middle, PNG/SVG download for menus, business cards and posters.'],
  ['QR Generator: logo, warna, PNG & SVG', 'QR Generator: logo, colours, PNG & SVG'],
  ['Buat Teks &amp; Logo 3D Online Gratis, Ekspor STL/GLB | Efrino Tools', 'Free 3D Text & Logo Maker Online, Export STL/GLB | Efrino Tools'],
  ['Buat Teks & Logo 3D Online Gratis, Ekspor STL/GLB | Efrino Tools', 'Free 3D Text & Logo Maker Online, Export STL/GLB | Efrino Tools'],
  ['Ubah teks atau logo SVG menjadi model 3D. Atur ketebalan, bevel, dan material, lalu ekspor GLB untuk web/AR atau STL untuk 3D print. Gratis di browser.', 'Turn text or an SVG logo into a 3D model. Adjust depth, bevel and material, then export GLB for web/AR or STL for 3D printing. Free, in your browser.'],
  ['3D Maker: teks & logo ke model 3D', '3D Maker: text and logos to 3D models'],
  ['Tools Online Gratis Tanpa Upload: Hapus Background, Gabung PDF, Kompres Foto | Efrino Tools', 'Free Online Tools, No Upload: Remove Background, Merge PDF, Compress Images | Efrino Tools'],
  ['Tools online gratis tanpa upload dan tanpa watermark: hapus background foto, gabung PDF, kompres foto, buat QR code, teks 3D. Semua berjalan di browser Anda.', 'Free online tools with no uploads and no watermarks: remove image backgrounds, merge PDFs, compress images, make QR codes and 3D text. Everything runs in your browser.'],
  ['Background Remover AI, 3D Maker, Image Compressor, QR Generator. File tidak pernah di-upload.', 'AI Background Remover, 3D Maker, Image Compressor, QR Generator. Files never leave your device.'],
  ['Tools online gratis yang berjalan di browser: hapus background, gabung PDF, kompres foto, QR code, teks 3D.', 'Free online tools that run in your browser: background remover, PDF merge, image compressor, QR codes, 3D text.'],
  // --- schema names (also used in the visible guide headings)
  ['Hapus Background Foto (Background Remover)', 'Background Remover'],
  ['Gabung PDF (PDF Merge)', 'PDF Merge'],
  ['Kompres &amp; Konversi Foto (Image Compressor)', 'Image Compressor & Converter'],
  ['Kompres & Konversi Foto (Image Compressor)', 'Image Compressor & Converter'],
  ['Pembuat QR Code (QR Generator)', 'QR Code Generator'],
  ['Pembuat Teks &amp; Logo 3D (3D Maker)', '3D Text & Logo Maker'],
  ['Pembuat Teks & Logo 3D (3D Maker)', '3D Text & Logo Maker'],
  ['Cara memakai ', 'How to use '],
  // --- hub
  ['Tools gratis yang', 'Free tools that'], ['menghormati privasi.', 'respect your privacy.'],
  ['Semua tool berjalan 100% di browser Anda dengan WebAssembly, WebGPU, dan Canvas. Tidak ada upload, tidak ada akun, tidak ada watermark.', 'Every tool runs 100% in your browser with WebAssembly, WebGPU and Canvas. No uploads, no accounts, no watermarks.'],
  ['🔒 File Anda tidak pernah meninggalkan perangkat ini', '🔒 Your files never leave this device'],
  ['Buka tool →', 'Open tool →'],
  // --- shared shell & catalogue (common.js)
  ['· Semua proses berjalan di perangkat Anda: file tidak pernah di-upload. ·', '· Everything runs on your device: files are never uploaded. ·'],
  ['Hapus background foto otomatis dengan AI, langsung di browser. Ekspor PNG transparan atau ganti warna latar.', 'Remove photo backgrounds automatically with AI, right in the browser. Export transparent PNGs or swap the background colour.'],
  ['Ubah teks atau logo SVG jadi model 3D dengan bevel & material. Ekspor GLB untuk web/AR atau STL untuk 3D print.', 'Turn text or an SVG logo into a 3D model with bevel and materials. Export GLB for web/AR or STL for 3D printing.'],
  ['Kompres & konversi banyak gambar sekaligus ke WebP, JPEG, atau PNG. Atur kualitas dan ukuran maksimal.', 'Compress and convert many images at once to WebP, JPEG or PNG. Set quality and maximum size.'],
  ['Gabungkan banyak PDF & foto jadi satu file. Atur urutan dan pilih halaman. Cocok untuk berkas lamaran & administrasi.', 'Combine PDFs and photos into one file. Reorder and pick pages. Ideal for job applications and paperwork.'],
  ['Buat QR code untuk link, Wi-Fi, atau teks. Warna kustom, logo di tengah, ekspor PNG & SVG.', 'Create QR codes for links, Wi-Fi or text. Custom colours, a centre logo, PNG & SVG export.'],
  ['Format ${f.name} tidak didukung.', '${f.name}: format not supported.'],
  ['${f.name} lebih dari ${maxMB} MB.', '${f.name} is larger than ${maxMB} MB.'],
  ['Tools gratis lainnya:', 'More free tools:'], ['Semua tools', 'All tools'],
  ['Butuh sistem untuk usaha Anda?', 'Need custom software for your business?'], ['Jasa pembuatan aplikasi', "Let's talk"],
  ['Pertanyaan umum', 'FAQ'],
  // --- background remover
  ['Model segmentasi AI berjalan langsung di browser Anda (WebGPU jika tersedia, WebAssembly sebagai cadangan). Pemakaian pertama mengunduh model sekitar 40 MB, lalu tersimpan di cache.', 'An AI segmentation model runs directly in your browser (WebGPU when available, WebAssembly as a fallback). The first use downloads a ~40 MB model, which is then cached.'],
  ['🔒 Foto Anda tidak pernah di-upload', '🔒 Your photo is never uploaded'],
  ['Jatuhkan foto di sini atau klik untuk memilih', 'Drop a photo here or click to choose'],
  ['JPG, PNG, WebP · maks 25 MB · atau tekan', 'JPG, PNG, WebP · max 25 MB · or press'],
  ['Menyiapkan model…', 'Preparing the model…'], ['Latar belakang', 'Background'], ['Warna kustom', 'Custom colour'],
  ['↺ Foto lain', '↺ Another photo'],
  ['Tips: geser garis tengah untuk membandingkan sebelum & sesudah.', 'Tip: drag the middle line to compare before and after.'],
  ['Klik area unggah atau tempel foto dengan Ctrl+V.', 'Click the upload area or paste a photo with Ctrl+V.'],
  ['Tunggu AI memisahkan objek dari latar (pertama kali mengunduh model ±40 MB).', 'Wait for the AI to separate the subject (the first run downloads a ~40 MB model).'],
  ['Pilih latar transparan, putih, atau warna lain.', 'Choose a transparent, white or coloured background.'],
  ['Klik Download untuk menyimpan PNG, WebP, atau JPG.', 'Click Download to save a PNG, WebP or JPG.'],
  ['Apakah benar gratis dan tanpa watermark?', 'Is it really free with no watermark?'],
  ['Ya. Tidak ada batas pemakaian, tidak perlu akun, dan hasil tidak diberi watermark.', 'Yes. No usage limits, no account, and no watermark on the result.'],
  ['Apakah foto saya di-upload ke server?', 'Is my photo uploaded to a server?'],
  ['Tidak. Model AI berjalan di browser Anda (WebGPU/WebAssembly), jadi foto tidak pernah meninggalkan perangkat.', 'No. The AI model runs in your browser (WebGPU/WebAssembly), so the photo never leaves your device.'],
  ['Bisa untuk foto produk jualan online?', 'Does it work for e-commerce product photos?'],
  ['Bisa. Pilih latar putih untuk marketplace seperti Shopee dan Tokopedia, lalu unduh sebagai JPG.', 'Yes. Pick a white background for marketplaces such as Amazon, Etsy or Shopee, then download as JPG.'],
  ['Kenapa pertama kali agak lama?', 'Why is the first run slower?'],
  ['Browser mengunduh model AI sekali (±40 MB). Pemakaian berikutnya jauh lebih cepat karena model tersimpan di cache.', 'Your browser downloads the AI model once (~40 MB). Later runs are much faster because the model is cached.'],
  ['Pilih atau jatuhkan foto', 'Choose or drop a photo'], ['Foto asli', 'Original photo'],
  ['Memuat library AI…', 'Loading the AI library…'],
  ['Mengunduh model AI… ${pct}% (sekali saja)', 'Downloading the AI model… ${pct}% (one time only)'],
  ['Memproses… ${pct}%', 'Processing… ${pct}%'],
  ['Selesai dalam ${((performance.now() - t0) / 1000).toFixed(1)} detik ✨', 'Done in ${((performance.now() - t0) / 1000).toFixed(1)} s ✨'],
  ['Gagal memproses foto. Coba foto lain atau browser terbaru (Chrome/Edge).', 'Could not process this photo. Try another photo or a recent browser (Chrome/Edge).'],
  ['JPG tidak mendukung transparansi, latar akan putih.', 'JPG has no transparency; the background will be white.'],
  ['Tersimpan · ${fmtBytes(blob.size)}', 'Saved · ${fmtBytes(blob.size)}'],
  // --- PDF merge
  ['Gabungkan beberapa PDF, plus foto/scan JPG atau PNG, menjadi satu file. Atur urutan dan pilih halaman yang diambil dari tiap file. Cocok untuk berkas lamaran, laporan, atau dokumen administrasi.', 'Combine several PDFs, plus JPG or PNG photos and scans, into one file. Reorder them and pick which pages to keep from each. Ideal for job applications, reports and paperwork.'],
  ['🔒 Dokumen Anda tidak pernah di-upload', '🔒 Your documents are never uploaded'],
  ['Jatuhkan PDF / gambar atau klik untuk memilih', 'Drop PDFs / images or click to choose'],
  ['Bisa banyak file · PDF, JPG, PNG · maks 100 MB per file', 'Multiple files · PDF, JPG, PNG · max 100 MB each'],
  ['Total halaman', 'Total pages'], ['Nama file', 'File name'], ['Ukuran halaman gambar', 'Image page size'],
  ['A4 (gambar dipaskan)', 'A4 (image fitted)'], ['Ukuran asli gambar', 'Original image size'],
  ['⚡ Gabungkan & Download', '⚡ Merge & download'],
  ['Rentang halaman: kosongkan untuk semua, atau tulis mis.', 'Page ranges: leave empty for all, or type e.g.'],
  ['Pilih atau seret beberapa file PDF, JPG, atau PNG.', 'Choose or drag several PDF, JPG or PNG files.'],
  ['Atur urutan dengan menyeret atau tombol panah.', 'Reorder by dragging or with the arrow buttons.'],
  ['Isi rentang halaman bila hanya perlu sebagian, misalnya 1-3, 5.', 'Enter page ranges if you only need some pages, e.g. 1-3, 5.'],
  ['Klik Gabungkan & Download.', 'Click Merge & download.'],
  ['Bisa menggabungkan PDF dengan foto KTP atau ijazah?', 'Can I combine PDFs with photos of my ID or certificates?'],
  ['Bisa. Foto JPG/PNG otomatis dijadikan halaman PDF berukuran A4.', 'Yes. JPG/PNG photos become A4 PDF pages automatically.'],
  ['Apakah dokumen saya aman?', 'Are my documents safe?'],
  ['Ya. Penggabungan dilakukan di browser Anda; dokumen tidak di-upload ke server mana pun.', 'Yes. Merging happens in your browser; documents are never uploaded to any server.'],
  ['Bisa ambil halaman tertentu saja?', 'Can I take only certain pages?'],
  ['Bisa. Tulis rentang seperti 1-3, 5, 8- pada setiap file PDF.', 'Yes. Type ranges such as 1-3, 5, 8- for each PDF.'],
  ['Ada batas ukuran file?', 'Is there a file size limit?'],
  ['Hingga 100 MB per file, tergantung memori perangkat Anda.', 'Up to 100 MB per file, depending on your device memory.'],
  ['Pilih file PDF atau gambar', 'Choose PDF or image files'], ['Seret untuk mengurutkan', 'Drag to reorder'],
  ['semua halaman (1-${d.count})', 'all pages (1-${d.count})'], ['Rentang halaman', 'Page range'],
  ["'1 halaman'", "'1 page'"], ['`${d.count} halaman`', '`${d.count} pages`'], ["' · 🔒 terenkripsi'", "' · 🔒 encrypted'"],
  ['${file.name} terenkripsi, hasilnya mungkin kosong. Buka kuncinya dulu.', '${file.name} is encrypted and may come out blank. Unlock it first.'],
  ['${file.name} rusak atau tidak bisa dibaca.', '${file.name} is damaged or unreadable.'],
  ['Memproses ${i + 1}/${docs.length}: ${d.file.name}', 'Processing ${i + 1}/${docs.length}: ${d.file.name}'],
  ['✓ ${out.getPageCount()} halaman · ${fmtBytes(bytes.length)} · ${((performance.now() - t0) / 1000).toFixed(1)} detik', '✓ ${out.getPageCount()} pages · ${fmtBytes(bytes.length)} · ${((performance.now() - t0) / 1000).toFixed(1)} s'],
  ['PDF berhasil digabung ✨', 'PDF merged ✨'], ['Gagal menggabungkan. Ada file yang tidak didukung.', 'Merge failed: one of the files is not supported.'],
  ["'gabungan'", "'merged'"], ['value="gabungan"', 'value="merged"'],
  // --- compressor
  ['Kecilkan ukuran foto untuk web, WhatsApp, atau lampiran email. Proses banyak file sekaligus, ubah format, dan batasi resolusi maksimal.', 'Shrink images for the web, messaging apps or email attachments. Process many files at once, change format and cap the resolution.'],
  ['🔒 Diproses di browser, tidak ada upload', '🔒 Processed in your browser, no upload'],
  ['Jatuhkan gambar atau klik untuk memilih', 'Drop images or click to choose'],
  ['Bisa banyak file sekaligus · JPG, PNG, WebP, GIF, BMP · maks 30 MB per file', 'Many files at once · JPG, PNG, WebP, GIF, BMP · max 30 MB each'],
  ['Sisi terpanjang maks.', 'Max longest side'], ['⬇ Download semua', '⬇ Download all'],
  ['Pengaturan baru langsung diterapkan ke semua file. PNG bersifat lossless, jadi slider kualitas tidak berpengaruh.', 'New settings apply to all files instantly. PNG is lossless, so the quality slider has no effect on it.'],
  ['Pilih atau seret satu atau banyak foto.', 'Choose or drag one or more images.'],
  ['Pilih format WebP, JPEG, atau PNG.', 'Pick WebP, JPEG or PNG.'],
  ['Atur kualitas dan resolusi maksimal sampai ukurannya sesuai.', 'Adjust quality and max resolution until the size fits.'],
  ['Unduh per file atau semua sekaligus.', 'Download files one by one or all at once.'],
  ['Bagaimana cara mengecilkan foto jadi di bawah 100 KB?', 'How do I get an image under 100 KB?'],
  ['Pilih JPEG atau WebP, turunkan kualitas ke ±60–70%, dan batasi sisi terpanjang ke 1280 px atau 800 px.', 'Choose JPEG or WebP, lower quality to about 60–70%, and cap the longest side at 1280 px or 800 px.'],
  ['Apa bedanya WebP dan JPEG?', "What's the difference between WebP and JPEG?"],
  ['WebP biasanya 25–35% lebih kecil dengan kualitas setara dan didukung semua browser modern. JPEG paling kompatibel untuk formulir lama.', 'WebP is usually 25–35% smaller at the same quality and works in all modern browsers. JPEG is the safest choice for older forms.'],
  ['Apakah foto di-upload?', 'Are my images uploaded?'], ['Tidak. Kompresi dilakukan di browser Anda.', 'No. Compression happens in your browser.'],
  ['Pilih gambar', 'Choose images'],
  ['${done.length} file diunduh', '${done.length} files downloaded'],
  ['hemat ${Math.max(0, Math.round((1 - b / a) * 100))}%', 'saved ${Math.max(0, Math.round((1 - b / a) * 100))}%'],
  ['format tidak didukung browser ini.', 'format not supported by this browser.'],
  ['Memproses ${it.file.name', 'Processing ${it.file.name'],
  // --- QR
  ['QR statis tanpa redirect, tanpa kedaluwarsa, tanpa pelacakan. Langsung bisa dicetak untuk menu, kartu nama, atau poster.', 'Static QR codes: no redirects, no expiry, no tracking. Ready to print on menus, business cards or posters.'],
  ['🔒 Dibuat di browser Anda', '🔒 Made in your browser'],
  ['Nama Wi-Fi (SSID)', 'Wi-Fi name (SSID)'], ['Tanpa password', 'No password'],
  ['Nomor (format 62…)', 'Number with country code (e.g. 1…, 44…, 62…)'], ['Pesan awal (opsional)', 'Pre-filled message (optional)'],
  ['＋ Logo di tengah (opsional)', '＋ Centre logo (optional)'],
  ['Pilih jenis QR: Link, Wi-Fi, WhatsApp, atau Teks.', 'Pick a QR type: Link, Wi-Fi, WhatsApp or Text.'],
  ['Isi data, misalnya URL atau nama &amp; password WiFi.', 'Fill in the data, e.g. a URL or the WiFi name and password.'],
  ['Isi data, misalnya URL atau nama & password WiFi.', 'Fill in the data, e.g. a URL or the WiFi name and password.'],
  ['Gambar tidak bisa dibaca.', 'The image could not be read.'],
  ['Atur warna, gaya titik, dan tambahkan logo bila perlu.', 'Set colours and dot style, and add a logo if you like.'],
  ['Unduh PNG atau SVG, lalu cetak.', 'Download a PNG or SVG and print it.'],
  ['Apakah QR code-nya bisa kedaluwarsa?', 'Will the QR code expire?'],
  ['Tidak. QR ini statis: datanya tersimpan di kode itu sendiri, tanpa redirect atau langganan.', 'No. These are static codes: the data lives in the code itself, with no redirect or subscription.'],
  ['Bagaimana membuat QR WiFi?', 'How do I make a WiFi QR code?'],
  ['Pilih tab Wi-Fi, isi nama jaringan dan password. Tamu cukup scan untuk tersambung.', 'Open the Wi-Fi tab and enter the network name and password. Guests just scan to connect.'],
  ['Apakah logo di tengah membuat QR sulit dibaca?', 'Does a centre logo make the QR code harder to scan?'],
  ['Saat ada logo, koreksi error dinaikkan ke level H (30%) agar tetap terbaca.', 'With a logo, error correction is raised to level H (30%) so it still scans.'],
  ['Pratinjau QR code', 'QR code preview'], ['Logo di tengah', 'Centre logo'],
  ['Isi data untuk membuat QR.', 'Enter some data to create a QR code.'],
  ['${m.n}×${m.n} modul · koreksi error', '${m.n}×${m.n} modules · error correction'],
  ['PNG 1024px tersimpan', 'PNG (1024 px) saved'], ['QR disalin ke clipboard', 'QR copied to clipboard'],
  ['Browser tidak mengizinkan copy gambar.', 'Your browser does not allow copying images.'],
  ['SVG tersimpan (versi vektor polos tanpa logo/gaya)', 'SVG saved (plain vector, without logo/style)'], ['SVG tersimpan', 'SVG saved'],
  // --- 3D maker
  ['Ketik teks atau unggah logo SVG, lalu atur ketebalan, bevel, dan material. Ekspor', 'Type text or upload an SVG logo, then adjust depth, bevel and material. Export'],
  [' untuk web, AR, atau Blender, dan ', ' for web, AR or Blender, and '], [' untuk 3D printing.', ' for 3D printing.'],
  ['🔒 Dirender di GPU Anda, tidak ada yang di-upload', '🔒 Rendered on your GPU, nothing uploaded'],
  ['drag: putar · scroll/pinch: zoom · klik kanan: geser', 'drag: rotate · scroll/pinch: zoom · right-click: pan'],
  ['Pilih / jatuhkan file .svg', 'Choose / drop an .svg file'], ['Putar otomatis', 'Auto-rotate'],
  ['Ketik teks atau unggah logo dalam format SVG.', 'Type text or upload a logo in SVG format.'],
  ['Atur ketebalan dan bevel.', 'Adjust depth and bevel.'],
  ['Pilih warna dan material: plastik, metal, chrome, atau kaca.', 'Pick a colour and material: plastic, metal, chrome or glass.'],
  ['Ekspor GLB, STL, atau gambar PNG.', 'Export GLB, STL or a PNG image.'],
  ['Apa bedanya STL dan GLB?', "What's the difference between STL and GLB?"],
  ['STL untuk 3D printing (bentuk saja). GLB untuk web, AR, dan Blender (bentuk + material).', 'STL is for 3D printing (shape only). GLB is for web, AR and Blender (shape + material).'],
  ['Logo saya tidak muncul?', "My logo doesn't show up?"],
  ['Gunakan SVG dengan bentuk berisi (fill). Logo yang hanya garis (stroke) tidak bisa diekstrusi.', 'Use an SVG with filled shapes. Outline-only (stroke) logos cannot be extruded.'],
  ['Pilih file SVG', 'Choose an SVG file'], ['Unggah file SVG untuk mulai.', 'Upload an SVG file to start.'],
  ['bentuk dimuat dari', 'shapes loaded from'], ['} segitiga`', '} triangles`'],
  ['SVG tidak berisi path yang bisa diekstrusi. Coba logo dengan fill (bukan stroke saja).', 'This SVG has no paths that can be extruded. Try a logo with filled shapes (not just strokes).'],
  ['GLB tersimpan', 'GLB saved'], ['STL tersimpan, siap untuk slicer 3D print', 'STL saved, ready for your 3D-printing slicer'],
  ['Screenshot tersimpan', 'Screenshot saved'], ['Font gagal dimuat.', 'Font failed to load.'],
];
// Labels that are only replaced when they stand alone between tags/quotes.
const LABELS = [
  ['Teks', 'Text'], ['Bentuk', 'Shape'], ['Ketebalan', 'Depth'], ['Warna', 'Colour'], ['Latar', 'Background'], ['Plastik', 'Plastic'], ['Kaca', 'Glass'],
  ['Ekspor', 'Export'], ['Asli', 'Original'], ['Hasil', 'Result'], ['Transparan', 'Transparent'], ['Putih', 'White'], ['Hitam', 'Black'], ['Biru', 'Blue'],
  ['Merah', 'Red'], ['Gradien', 'Gradient'], ['Kualitas', 'Quality'], ['Format output', 'Output format'], ['Bersihkan', 'Clear'], ['Asli', 'Original'],
  ['Naik', 'Up'], ['Turun', 'Down'], ['Hapus', 'Remove'], ['Gagal.', 'Failed.'], ['Siap.', 'Ready.'], ['Hasil', 'Result'], ['Keamanan', 'Security'],
  ['Gaya', 'Style'], ['Kotak', 'Square'], ['Bulat', 'Rounded'], ['Titik', 'Dots'], ['Hapus logo', 'Remove logo'], ['Panduan', 'Guide'],
  ['Hapus Background', 'Remove Background'], ['Gabung PDF', 'Merge PDF'], ['Kompres Foto', 'Compress Images'], ['Teks 3D', '3D Text'], ['Asli', 'Original'],
];

const SLUGS = 'bg-remover|pdf-merge|compress|qr|3d-maker';
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RULES = [
  ...[...PAIRS].sort((a, b) => b[0].length - a[0].length).map(([id, en]) => [new RegExp(esc(id), 'g'), en.replace(/\$/g, '$$$$')]),
  ...LABELS.map(([id, en]) => [new RegExp(`(?<=[>"'\`])${esc(id)}(?=\\s*[<"'\`])`, 'g'), en]),
];

function toEnglish(text, page) {
  let s = text;
  for (const [re, en] of RULES) s = s.replace(re, en);
  return s
    .replace('<html lang="id">', '<html lang="en">')
    .replace(/"inLanguage": "id"/g, '"inLanguage": "en"')
    // canonical / og:url / internal links point at the English pages
    .replace(new RegExp(`https://tools\\.efrino\\.web\\.id/(${SLUGS})\\b`, 'g'), 'https://tools.efrino.web.id/en/$1')
    .replace(/(rel="canonical" href="https:\/\/tools\.efrino\.web\.id)\/"/, '$1/en/"')
    .replace(new RegExp(`href="/(${SLUGS})"`, 'g'), 'href="/en/$1"')
    .replace('href="/${t.slug}"', 'href="/en/${t.slug}"')
    .replace(/<a href="\/">/g, '<a href="/en/">')
    .replace('<a href="/">Semua tools</a>', '<a href="/en/">All tools</a>')
    .replace(/https:\/\/jasa\.efrino\.web\.id/g, 'https://efrino.web.id/?lang=en#contact');
}

// hreflang pair for every tools page (both editions).
function hreflang(html, slug) {
  const base = 'https://tools.efrino.web.id', p = slug ? `/${slug}` : '/';
  const tags = `<link rel="alternate" hreflang="id" href="${base}${p}">\n<link rel="alternate" hreflang="en" href="${base}/en${p}">\n<link rel="alternate" hreflang="x-default" href="${base}${p}">\n`;
  return html.replace('<meta name="theme-color"', tags + '<meta name="theme-color"');
}

module.exports = { toEnglish, hreflang };
