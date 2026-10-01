// Edit this file to update portfolio content.
export const typedRoles = [
  'Industrial Digitalization', 'Full-Stack Web (Vue · React)', 'Flutter Mobile & Handheld', 'REST APIs & Real-time SSE', 'Local AI & Automation',
];

const gh = n => `https://github.com/efrino/${n}`;
export const projects = [
  { icon: '🧰', title: 'Efrino Tools', cat: 'Web', live: 'https://tools.efrino.web.id', desc: 'Kumpulan tools publik yang berjalan 100% di browser: Background Remover AI (ONNX via WebGPU/WASM), 3D Maker teks/logo → GLB/STL, batch Image Compressor, dan QR Generator. Nol upload, nol biaya server.', tags: ['WebGPU', 'WASM', 'Three.js', 'Canvas'] },
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
  { sub: 'tools', name: 'Efrino Tools', desc: 'Background Remover AI, 3D Maker, Compressor, QR: gratis & tanpa upload.', url: 'https://tools.efrino.web.id' },
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
  Frontend: ['Vue 3', 'React', 'Tailwind CSS', 'Vite', 'TypeScript', 'Three.js'],
  Backend: ['CodeIgniter', 'Express', 'Hapi', 'FastAPI', 'Flask', 'REST · JWT · SSE'],
  Mobile: ['Flutter', 'Dart', 'Riverpod', 'BLoC', 'Hive', 'Codemagic'],
  'Data & Cloud': ['MySQL', 'PostgreSQL', 'Supabase', 'Firebase', 'SQLite', 'Vercel'],
  'AI & Ops': ['PyTorch', 'Transformers', 'LLM APIs', 'Docker', 'Traefik', 'Git'],
  Industry: ['PPIC', 'MRP / BOM', 'Inventory', 'SAP integration', 'Barcode / QR', 'Thermal printing'],
};
