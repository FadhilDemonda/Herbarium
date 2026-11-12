# Herbarium — Pustaka Query Superset

Herbarium adalah aplikasi web internal untuk mencari, membaca, menyalin, dan mengelola koleksi query SQL tim analis data dan pengguna Apache Superset. Frontend React terhubung ke Google Apps Script yang memakai Google Sheets sebagai penyimpanan.

## Fitur

- Pencarian fuzzy melalui kolom pencarian dan command palette (`Ctrl`/`Cmd` + `K`).
- Filter kategori, jenis, dan instalasi; state filter tersimpan pada URL.
- Tampilan grid atau tabel, detail query, syntax highlighting, penyalinan satu klik, serta ekspor CSV dan JSON.
- Tema terang dan gelap, favorit lokal, loading, empty state, dan error state.
- Login editor untuk membuat, mengubah, atau menghapus query.
- Halaman Master Data untuk mengelola kategori, jenis, dan instalasi. Perubahan nama diperbarui ke query terkait; penghapusan memindahkan query ke nilai fallback.

## Arsitektur

```text
React + Vite (Netlify)
        │
        ├── cache lokal dan sessionStorage di browser
        │
Google Apps Script Web App
        │
Google Sheets: queries, users, categories, types, installations
```

Koleksi terakhir ditampilkan dari cache lokal ketika halaman dibuka. Aplikasi kemudian mengambil data terbaru di latar belakang; respons server, termasuk daftar kosong, menggantikan cache tersebut. Jika koneksi ke backend gagal, cache lokal menjadi fallback.

## Menjalankan lokal

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

Isi `VITE_GAS_URL` pada `.env` dengan URL deployment Google Apps Script. Untuk pemeriksaan produksi:

```bash
npm run lint
npm run build
```

## Struktur proyek

```text
apps-script/  Backend Google Apps Script dan panduan setup
data/         Seed lokal untuk demo dan migrasi
docs/         PRD, desain, dan aturan pengembangan
public/       Aset statis serta redirect SPA
scripts/      Parser migrasi query
src/          Frontend React
```

## Keamanan dan data

- Endpoint daftar bersifat publik agar viewer dapat membaca dan menyalin query. Jangan masukkan PHI, password, secret, atau informasi operasional rahasia ke query yang dipublikasikan.
- `data/` hanya boleh berisi data contoh atau query yang aman dibagikan. Jangan commit data produksi atau kredensial.
- Token sesi disimpan pada `sessionStorage` selama enam jam. Cache query dan preferensi UI tersimpan pada `localStorage`.
- Sheet `users` hanya boleh diakses admin. Password MVP masih berupa teks biasa di Sheet; gunakan password kuat dan unik yang tidak dipakai pada layanan lain.
- Detail error internal backend dicatat pada log Apps Script dan tidak dikirim ke browser.

Lihat [panduan backend](apps-script/README.md) untuk menyiapkan Spreadsheet dan deployment Google Apps Script.
