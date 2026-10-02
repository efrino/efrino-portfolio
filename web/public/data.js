// Edit this file to update portfolio content.
export const typedRoles = [
  'Industrial Digitalization', 'SaaS Builder (Opnamo · Balasin)', 'Full-Stack Web (Vue · React)', 'Flutter Mobile & Handheld', 'AI Agents & Automation', 'Self-hosted DevOps (Docker · Coolify)',
];

const gh = n => `https://github.com/efrino/${n}`;
export const projects = [
  { icon: '💬', title: 'Balasin: WhatsApp AI SaaS', cat: 'AI', live: 'https://balasin.efrino.web.id', desc: 'Asisten WhatsApp multi-tenant untuk UMKM: LLM yang di-grounding ke katalog & FAQ toko, pesanan dengan harga dihitung ulang di server dan konfirmasi eksplisit pelanggan, handoff ke manusia, jam operasional, dan sesi WhatsApp tersimpan di PostgreSQL.', tags: ['Node.js', 'PostgreSQL', 'LLM', 'WhatsApp', 'Multi-tenant'] },
  { icon: '✅', title: 'Opnamo: Stock-Taking SaaS', cat: 'Industrial', live: 'https://opnamo.efrino.web.id', desc: 'Produk SaaS multi-tenant untuk stok opname UMKM: tag QR, scan kamera HP sebagai PWA offline-first dengan sinkronisasi idempoten, laporan selisih dalam rupiah, impor/ekspor Excel, dan cetak label A4/thermal 58mm.', tags: ['Node.js', 'PostgreSQL', 'PWA', 'IndexedDB', 'Multi-tenant'] },
  { icon: '🛰️', title: 'Radar: AI Career & Project Agent', cat: 'AI', private: true, desc: 'Agen pribadi yang memantau 6 sumber lowongan publik + leads jasa, menilai kecocokan dengan rubrik AI dan gerbang lokasi deterministik, lalu menyiapkan draft. Asisten tool-calling: buat PDF, siapkan email (wajib konfirmasi), kirim laporan ke WhatsApp & Telegram. PWA + iOS Shortcut untuk share dari LinkedIn.', tags: ['Node.js', 'SQLite', 'LLM Tool Calling', 'Baileys', 'PWA'] },
  { icon: '🧰', title: 'Efrino Tools', cat: 'Web', live: 'https://tools.efrino.web.id', desc: 'Lima tools publik yang berjalan 100% di browser: Background Remover AI (ONNX via WebGPU/WASM), 3D Maker → GLB/STL, PDF Merge, batch Image Compressor, QR Generator. Nol upload, dioptimasi SEO dengan schema HowTo/FAQ.', tags: ['WebGPU', 'WASM', 'Three.js', 'pdf-lib', 'SEO'] },
  { icon: '📊', title: 'Excel → Web App (live demo)', cat: 'Web', live: 'https://jasa.efrino.web.id/demo', desc: 'Upload file Excel/CSV dan dalam hitungan detik terbentuk web app: deteksi tipe kolom otomatis, KPI, grafik, tabel yang bisa dicari & diurutkan, form yang dibangkitkan dari tipe data, dan ekspor kembali ke Excel. Semua di browser.', tags: ['SheetJS', 'SVG charts', 'Vanilla JS'] },
  { icon: '🖥️', title: 'Self-hosted Platform', cat: 'Backend', private: true, desc: 'Satu VPS menjalankan 6+ aplikasi production lewat Coolify: Traefik dengan SSL otomatis untuk 15+ subdomain, auto-deploy dari GitHub, PostgreSQL privat dengan backup harian, health check, gzip & security headers.', tags: ['Docker', 'Coolify', 'Traefik', 'PostgreSQL', 'Linux'] },
  { icon: '🏭', title: 'PPIC Smart Planner', cat: 'Industrial', private: true, desc: 'Flagship internal: menggantikan kalkulasi PPIC manual Excel. Pipeline 16 langkah dengan progress SSE live menghasilkan jadwal produksi welding harian, stock rolling, analisis achievement & alert delivery-miss.', tags: ['CodeIgniter 3', 'Vue 3', 'MySQL', 'SSE'] },
  { icon: '🏷️', title: 'STO Prep: Stock-Taking Tags', cat: 'Mobile', repo: 'sto', desc: 'Aplikasi Android lantai produksi: login ID karyawan, cari part, cetak tag QR di thermal printer 58mm bawaan, scan balik dengan qty. Approval pembatalan & menu berbasis role.', tags: ['Flutter', 'SQLite', 'Thermal Printer', 'QR'] },
  { icon: '🛍️', title: 'Nayea: Modest Fashion E-commerce', cat: 'Web', repo: 'nayea', live: 'https://shop.efrino.web.id', desc: 'Storefront + admin panel lengkap: katalog, cart, checkout, wishlist, live chat, manajemen order/pembayaran, ongkir serverless & email transaksi. Supabase dengan Row Level Security.', tags: ['React', 'Vite', 'Tailwind', 'Supabase', 'Vercel'] },
  { icon: '📱', title: 'Meca Learning', cat: 'Mobile', repo: 'meca_learning_app', desc: 'Aplikasi training mekanik: modul, kuis, lookup error-code, animasi; konten PDF/Excel/video dari Google Drive di-cache offline. Push notification & build iOS via Codemagic.', tags: ['Flutter', 'Riverpod', 'Supabase', 'Firebase', 'Hive'] },
  { icon: '🧑‍💼', title: 'Meca Admin Console', cat: 'Web', repo: 'admin-asto', live: 'https://admin.efrino.web.id', desc: 'Konsol admin di balik Meca Learning: users, modul, kuis, error codes, activity logs, bulk import dari Excel & Google Drive.', tags: ['React', 'Vite', 'Tailwind'] },
  { icon: '🚚', title: 'My Armada: Warehouse Scan', cat: 'Mobile', repo: 'my_armada', desc: 'Aplikasi operasional gudang all-in-one: scan-in/out via kamera atau manual, stock-taking, riwayat scan, manajemen area & user berbasis permission.', tags: ['Flutter', 'Barcode', 'REST API'] },
  { icon: '🔧', title: 'Manufacturing REST Core', cat: 'Backend', repo: 'rest_maj1', desc: 'Backend operasi manufaktur: inventory, Andon, kanban, maintenance, forecasting & endpoint integrasi SAP.', tags: ['PHP', 'CodeIgniter', 'MySQL', 'JWT', 'SAP'] },
  { icon: '🔍', title: 'QC Defect Detection', cat: 'AI', repo: 'qc_model', desc: 'Layanan FastAPI untuk deteksi cacat part stamping menggunakan model object-detection DETR.', tags: ['Python', 'FastAPI', 'PyTorch', 'Transformers'] },
  { icon: '💬', title: 'AI WhatsApp Commerce Bot', cat: 'AI', private: true, desc: 'Bot CS & pemesanan: fuzzy product matching, alur order, pembayaran Midtrans & fallback multi-provider AI (Groq → Gemini → OpenRouter).', tags: ['Node.js', 'Baileys', 'Supabase', 'Midtrans'] },
  { icon: '🎬', title: 'YouTube Shorts Automation', cat: 'AI', private: true, desc: 'Skrip AI → voice-over TTS → perakitan video FFmpeg → upload YouTube otomatis, dengan notifikasi Telegram.', tags: ['Python', 'FFmpeg', 'Groq', 'YouTube API'] },
  { icon: '🛠️', title: 'Mechanic Manual API', cat: 'Backend', repo: 'mechanic-manual-api', desc: 'REST API: JWT auth, modul, error codes, activity log, offline sync. Hardened dengan Helmet & rate limiting.', tags: ['Node.js', 'Express', 'MySQL', 'JWT'] },
  { icon: '📥', title: 'Scan GR', cat: 'Mobile', repo: 'scan_gr', desc: 'Scanner goods-receiving yang siap offline untuk penerimaan barang di gudang.', tags: ['Flutter', 'Offline-first'] },
].map(p => ({ ...p, repoUrl: p.repo && gh(p.repo) }));

export const subdomains = [
  { sub: '', name: 'Portfolio (you are here)', desc: 'Halaman utama: 3D, animasi, AI.', url: 'https://efrino.web.id' },
  { sub: 'balasin', name: 'Balasin', desc: 'SaaS admin WhatsApp AI untuk UMKM: jawab dari katalog, catat pesanan.', url: 'https://balasin.efrino.web.id' },
  { sub: 'opnamo', name: 'Opnamo', desc: 'SaaS stok opname: tag QR, scan HP offline, laporan selisih rupiah.', url: 'https://opnamo.efrino.web.id' },
  { sub: 'jasa', name: 'Jasa Excel → Web', desc: 'Digitalisasi proses Excel jadi aplikasi web. Coba demo dengan file Anda.', url: 'https://jasa.efrino.web.id' },
  { sub: 'tools', name: 'Efrino Tools', desc: 'Background Remover AI, 3D Maker, PDF Merge, Compressor, QR: gratis & tanpa upload.', url: 'https://tools.efrino.web.id' },
  { sub: 'ai', name: 'AI Playground', desc: 'Chat AI layar penuh.', url: 'https://ai.efrino.web.id' },
  { sub: 'shop', name: 'Nayea Store', desc: 'E-commerce modest fashion, React + Supabase.', url: 'https://shop.efrino.web.id' },
  { sub: 'admin', name: 'Meca Admin', desc: 'Konsol admin platform training mekanik.', url: 'https://admin.efrino.web.id' },
  { sub: 'story', name: 'Story App', desc: 'SPA submission Dicoding Web Intermediate.', url: 'https://story.efrino.web.id' },
  { sub: 'notes', name: 'Notes App', desc: 'Aplikasi catatan berbasis Web Components.', url: 'https://notes.efrino.web.id' },
  { sub: 'api', name: 'Hapi API', desc: 'REST API Hapi.js, capstone backend.', url: 'https://api.efrino.web.id' },
  { sub: 'github', name: 'GitHub', desc: '50+ repositori publik.', url: 'https://github.efrino.web.id' },
  { sub: 'linkedin', name: 'LinkedIn', desc: 'Profil profesional & rekomendasi.', url: 'https://linkedin.efrino.web.id' },
];

export const skills = {
  Frontend: ['Vue 3', 'React', 'Tailwind CSS', 'TypeScript', 'Three.js', 'PWA'],
  Backend: ['CodeIgniter', 'Express', 'Hapi', 'FastAPI', 'Flask', 'REST · JWT · SSE'],
  Mobile: ['Flutter', 'Dart', 'Riverpod', 'BLoC', 'Hive', 'Codemagic'],
  'Data & Cloud': ['MySQL', 'PostgreSQL', 'Supabase', 'Firebase', 'SQLite', 'Vercel'],
  'AI & Agents': ['LLM tool calling', 'Groq · Gemini', 'PyTorch', 'Transformers', 'WebGPU / ONNX', 'WhatsApp bots'],
  'DevOps': ['Docker', 'Coolify', 'Traefik', 'Linux VPS', 'CI/CD auto-deploy', 'Backups & monitoring'],
  Industry: ['PPIC', 'MRP / BOM', 'Inventory', 'SAP integration', 'Barcode / QR', 'Thermal printing'],
};
