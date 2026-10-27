# 🌿 Herbarium — Pustaka Query Superset

Herbarium adalah aplikasi web katalog dan repositori query SQL terpusat yang dirancang untuk tim analis data, BI (*Business Intelligence*), dan pengelola dashboard Apache Superset. Herbarium menghubungkan antarmuka modern yang cepat (*sat set*) dengan Google Sheets sebagai basis data *serverless* melalui Google Apps Script (GAS).

---

## ✨ Fitur Utama

- **⚡ Instant 0ms Load (Cache-First Hydration)**: Menggunakan arsitektur *Stale-While-Revalidate* — seluruh query langsung tampil seketika saat web dibuka, disinkronkan secara hening di latar belakang.
- **🔍 Pencarian Cepat (*Command Palette* `Ctrl+K` / `⌘K`)**: Pencarian *fuzzy* instan pada judul query, kategori, dan isi sintaks SQL.
- **▦ Mode Tampilan Ganda (Grid & Table View)**: Fleksibilitas beralih antara tampilan kartu visual atau tabel ringkas yang dilengkapi badge kategori dan tanggal pembaruan.
- **📊 Banner Statistik Ringkas Interaktif**: Metrik total koleksi, kategori dominan (klik untuk filter), dan query terbaru (klik untuk lihat detail) yang dapat diciutkan (*collapsible*).
- **📋 Salin 1-Klik & Syntax Highlighting**: Salin query SQL dengan sekali klik dan nikmati visualisasi kode SQL dengan Prism.js bertema natural Warm Cream & Forest Green.
- **✨ Format SQL Otomatis**: Tombol *Rapikan SQL* di modal formulir untuk merapikan klausa `SELECT`, `FROM`, `WHERE`, `JOIN`, dan indentasi secara otomatis.
- **📥 Ekspor Koleksi**: Unduh seluruh query atau hasil filter aktif ke format **CSV** (kompatibel Excel) dan **JSON**.
- **🔐 Otentikasi & Manajemen CRUD**: Fitur Tambah, Edit, dan Hapus query dengan modal validasi 4-field, dilindungi otentikasi sesi token dan kunci konkurensi di Google Apps Script.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React 18, Vite 6, CSS Modules & Vanilla CSS Tokens.
- **Syntax & Search**: Prism.js (SQL Grammar), Fuse.js (Fuzzy Search), Lucide React (Icons).
- **Backend / Database**: Google Sheets + Google Apps Script (REST API via Web App).
- **Hosting Target**: Netlify (SPA redirects & static assets caching).

---

## 🚀 Panduan Memulai Cepat (Local Development)

### 1. Kloning Repositori
```bash
git clone https://github.com/FadhilDemonda/Herbarium.git
cd Herbarium
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi URL deployment Google Apps Script Anda:
```env
VITE_GAS_URL=https://script.google.com/macros/s/AKfycb.../exec
```

### 4. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di `http://localhost:3000/` (atau port yang ditampilkan).

### 5. Build Produksi & Linting
```bash
npm run lint
npm run build
```

---

## 📁 Struktur Proyek

```text
Herbarium/
├── apps-script/          # Kode Google Apps Script (Code.gs) & Panduan Setup
├── data/                 # Seed dataset queries.json & queries.csv
├── docs/                 # Dokumentasi PRD & Desain Sistem
├── public/               # File statis dan _redirects untuk SPA hosting
├── src/
│   ├── api/              # Klien HTTP & Cache Manager (client.js)
│   ├── components/       # Komponen UI (Card, TableView, StatsBanner, Modals, Badges)
│   ├── context/          # Context Otentikasi (AuthContext.jsx)
│   ├── lib/              # Formatter, Clipboard, Syntax Highlighter, Exporter
│   ├── styles/           # CSS Tokens & Base Typography
│   ├── App.jsx           # Kontroler halaman utama
│   └── main.jsx          # Entry point aplikasi
├── netlify.toml          # Konfigurasi build dan caching Netlify
└── vite.config.js        # Konfigurasi Vite bundler
```

---

## 📄 Lisensi

Hak Cipta © 2026. Dikembangkan untuk efisiensi dokumentasi dan operasional query Superset.
