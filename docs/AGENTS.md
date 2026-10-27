# AGENTS.md: Herbarium (Pustaka Query Superset)

Baca `docs/PRD.md` (fungsional) dan `docs/DESIGN-PRD.md` (tampilan) sebelum mengerjakan apa pun.
PRD adalah sumber kebenaran. Jika ada konflik atau hal yang ambigu, tanyakan, jangan menebak.

## Stack
React + Vite, Google Apps Script (GAS) sebagai backend, Google Sheets sebagai database, Netlify untuk hosting frontend.
Pilih JavaScript **atau** TypeScript di awal dan jangan dicampur.

## Aturan Umum
- Kerjakan per milestone (M1 → M4) sesuai PRD. Jangan lompat dan jangan menambah fitur di luar PRD.
- Fitur yang **sengaja tidak ada**: deskripsi, tag, tautan Superset, role, halaman daftar akun. Jangan ditambahkan.
- Sebelum menulis kode besar, tulis rencana singkat (file yang dibuat/diubah).
- Setelah tiap milestone: jalankan lint dan build, lalu laporkan hasilnya.
- Bahasa UI: Indonesia. Kode, nama variabel, dan komentar: Inggris.
- Dependency baru harus disertai alasan. Utamakan library ringan (`prism-react-renderer` atau `highlight.js`, `fuse.js`, `lucide-react`).
- Jangan mengarang data query. Data hanya berasal dari file sumber atau input pengguna.

## Data
- Sheet `queries`: `id`, `title`, `category`, `type`, `sql_query`, `created_at`, `updated_at`, `updated_by`.
- Sheet `users`: `username`, `password`, `active`.
- `type` hanya boleh `Query` atau `Dashboard`.
- Form input hanya 4 isian: Judul, Kategori, Jenis, Query SQL.
- Baca header sheet berdasarkan nama kolom, bukan indeks tetap.

## Keamanan (wajib)
- Pencocokan username/password **hanya di GAS**. Frontend tidak pernah menerima isi sheet `users`.
- Endpoint `list` hanya membaca sheet `queries`, tidak boleh menyentuh `users`.
- Token sesi dibuat acak oleh GAS, disimpan di `CacheService` (masa berlaku 6 jam), dan di browser disimpan di `sessionStorage`. Jangan pakai `localStorage` untuk token.
- Batasi login: 5 kali gagal per username mengunci login 15 menit.
- Akun dengan `active` bukan `TRUE` tidak boleh login.
- URL deployment GAS tidak boleh di-hardcode. Frontend memakai `VITE_GAS_URL`. Sediakan `.env.example`.
- Jangan commit `.env`, data produksi di `data/`, password, atau kredensial apa pun. Jangan menulis password asli di contoh, seed, test, atau log.
- Render SQL sebagai teks. Dilarang `dangerouslySetInnerHTML` dengan input mentah.
- Kolom `sql_query` ditulis ke Sheet sebagai teks biasa (format `@`) agar isi berawalan `=`, `+`, `-`, `@` tidak dibaca sebagai formula.
- Validasi input di klien **dan** GAS: judul wajib (maks 150 karakter), kategori wajib, jenis hanya `Query`/`Dashboard`, SQL wajib.
- Jangan memasukkan atau meminta data pasien/PHI di contoh, seed, atau test.

## Frontend
- Komponen fungsional + hooks; satu tanggung jawab per komponen.
- Semua panggilan API lewat `src/api/client.js`. Komponen tidak memanggil `fetch` langsung.
- POST ke GAS: `Content-Type: text/plain;charset=utf-8`, body `JSON.stringify(...)`, tanpa header kustom (hindari preflight CORS).
- GAS selalu membalas HTTP 200. Baca hasil dari body `{ok, data|error}` dan tangani `error.code`.
- Jika menerima `UNAUTHORIZED`, hapus sesi lokal dan buka dialog login, lalu lanjutkan aksi setelah login berhasil.
- Tombol Tambah/Edit/Hapus hanya tampil saat login. Penyembunyian di UI bukan pengaman; server tetap memeriksa token.
- Wajib ada loading, empty, dan error state di setiap daftar dan aksi.
- Salin: `navigator.clipboard` dengan fallback `execCommand`; selalu tampilkan toast dan ubah tombol sementara.
- Semua warna dari CSS variables (`src/styles/tokens.css`). Dilarang hex langsung di komponen.
- Aksesibilitas: elemen interaktif bisa diakses keyboard, tombol ikon punya `aria-label`, modal menjebak fokus dan menutup dengan Esc.
- State filter (kategori, jenis, kata kunci) disinkronkan ke URL.

## Google Apps Script
- Satu file `Code.gs`, fungsi kecil: `doGet`, `doPost`, `handleList/Login/Logout/Create/Update/Delete`, `validate`, `requireAuth`.
- Semua respons lewat helper `json_(obj)` dengan bentuk `{ok, data|error}`.
- Operasi tulis dibungkus `LockService.getScriptLock()`.
- `id`, `created_at`, `updated_at`, `updated_by` dibuat server. Abaikan nilai dari klien.
- Hanya akses dua sheet: `queries` dan `users`.
- Sediakan `importBatch()` untuk impor `data/queries.json`. Fungsi ini dijalankan manual dari editor Apps Script, **bukan** endpoint web.
- Tulis `apps-script/README.md`: cara membuat Sheet dan kolom, menambah akun di sheet `users`, menempel kode, deploy sebagai Web App (*Execute as: Me*, *Anyone*), dan cara re-deploy saat kode berubah.
- Peringatkan di README: sheet **tidak boleh dibagikan** ke selain admin, karena password tersimpan sebagai teks biasa.

## Parser Migrasi
- Jangan memodifikasi `KODE & QUERY ANNISA.md`. Hanya baca.
- Pertahankan isi SQL persis (spasi, baris baru, komentar).
- Heuristik awal (H1 = kategori, H2 = judul, blok SQL = query) **belum terverifikasi**. Jika struktur file ambigu, berhenti dan minta contoh.
- `type` default `Query`. Jangan menebak `Dashboard`.
- Hasilkan laporan: total query, item tanpa judul/kategori, duplikat, blok kode yang tidak terpetakan.

## Deploy (Netlify)
- `netlify.toml`: build command `npm run build`, publish `dist`.
- `public/_redirects`: `/* /index.html 200`.
- Dokumentasikan variabel env (`VITE_GAS_URL`) yang harus diisi di dashboard Netlify.

## Definition of Done (per tugas)
- Memenuhi acceptance criteria milestone di PRD dan, untuk UI, di DESIGN-PRD.
- `npm run lint` dan `npm run build` lulus.
- Tidak ada secret atau data sensitif di diff.
- README/panduan diperbarui bila ada langkah setup baru.
- Ringkasan perubahan dan hal yang belum selesai dilaporkan di akhir.
