# Panduan Penyiapan Google Apps Script (Backend Herbarium)

Dokumen ini menjelaskan langkah-langkah lengkap untuk menyiapkan Google Sheets sebagai basis data dan Google Apps Script (GAS) sebagai Web API backend Herbarium.

---

> [!CAUTION]
> **Peringatan Keamanan Penting**:
> Google Spreadsheet ini **HANYA BOLEH DIAKSES OLEH ADMIN**. Jangan pernah membagikan akses Spreadsheet (Share/Bagikan) kepada pengguna umum atau publik, karena sheet `users` memuat password akun editor dalam format teks biasa (plain text).

---

## 1. Membuat Google Spreadsheet

1. Buka [Google Sheets](https://sheets.new) dan buat Spreadsheet baru dengan judul **Herbarium Database**.
2. Buat dua tab sheet di Spreadsheet tersebut:

### A. Sheet `queries`
Buat header di baris ke-1 (Row 1):
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| `id` | `title` | `category` | `type` | `sql_query` | `created_at` | `updated_at` | `updated_by` |

*Keterangan kolom:*
- `id`: ID unik query (`qry_...`)
- `title`: Judul query (maks 150 karakter)
- `category`: Kategori (mis. `Query Permintaan Dataset`, `Query Superset`, dll)
- `type`: Jenis query (`Query` atau `Dashboard`)
- `sql_query`: Teks query SQL
- `created_at`: Waktu pembuatan (ISO 8601)
- `updated_at`: Waktu terakhir diedit (ISO 8601)
- `updated_by`: Username editor terakhir

### B. Sheet `users`
Buat header di baris ke-1 (Row 1):
| A | B | C |
|---|---|---|
| `username` | `password` | `active` |

Tambahkan baris akun editor pertama (contoh):
- `username`: `annisa` (gunakan huruf kecil)
- `password`: `rahasia123` (ganti dengan kata sandi yang aman)
- `active`: `TRUE`

*Catatan:*
- Akun dengan `active` selain `TRUE` (misal `FALSE`) akan ditolak saat login.
- Penambahan atau penghapusan akun dilakukan langsung di sheet `users` ini oleh admin.

---

## 2. Memasang Kode di Google Apps Script

1. Di menu atas Spreadsheet, klik **Extensions (Ekstensi)** > **Apps Script**.
2. Beri nama proyek: **Herbarium Backend**.
3. Buka file `Code.gs`, hapus kode bawaan, dan tempelkan seluruh isi dari file [`apps-script/Code.gs`](file:///c:/Users/mfadh/OneDrive/Documents/1D/Herbarium/apps-script/Code.gs).
4. Klik ikon simpan (Save / Ctrl+S).

---

## 3. Impor Data Awal (`importBatch`)

Seluruh 20 data query dari migrasi sudah langsung tertanam (*embedded*) di dalam file `Code.gs` pada fungsi `importBatch()`, sehingga Anda tidak perlu menyalin JSON secara terpisah:

1. Di toolbar bagian atas editor Apps Script (di sebelah tombol **Debug** dan **Run**), perhatikan dropdown yang memilih nama fungsi (defaultnya biasanya bertuliskan `doGet` atau `myFunction`).
2. Klik dropdown tersebut dan pilih **`importBatch`**.
3. Klik tombol **Run** (Jalankan ▶).
4. Jika muncul jendela otorisasi (*Authorization Required*):
   - Klik **Review permissions**.
   - Pilih akun Google Anda.
   - Klik **Advanced** (Lanjutan) di kiri bawah modal.
   - Klik **Go to Herbarium Backend (unsafe)**.
   - Klik **Allow** (Izinkan).
5. Proses impor akan berjalan beberapa detik. Di bagian bawah (*Execution log*), akan muncul tulisan:
   `Import batch completed! Imported: 20 queries.`
6. Buka kembali tab Google Sheets Anda; seluruh 20 baris query SQL beserta kategorinya sudah masuk secara otomatis ke tab sheet `queries`.

---

## 4. Deploy sebagai Web App

1. Di kanan atas editor Apps Script, klik tombol **Deploy** > **New deployment**.
2. Klik ikon gerigi (Select type) > pilih **Web app**.
3. Isi konfigurasi deployment:
   - **Description**: `Herbarium Production v1`
   - **Execute as**: **Me** (`email_anda@gmail.com`)
   - **Who has access**: **Anyone** *(Siapa saja, bahkan anonim)*
4. Klik tombol **Deploy**.
5. Salin **Web app URL** yang dihasilkan (format: `https://script.google.com/macros/s/AKfycb.../exec`).

---

## 5. Hubungkan ke Frontend

1. Buka file `.env` di direktori utama proyek Herbarium (atau salin dari `.env.example`).
2. Masukkan URL Web App tersebut:
   ```env
   VITE_GAS_URL=https://script.google.com/macros/s/AKfycb.../exec
   ```
3. Simpan file `.env`. Jangan commit file `.env` ke Git repository.

---

## 6. Cara Memperbarui Kode (Re-deployment)

Setiap kali Anda mengubah kode di `Code.gs`:

1. Simpan perubahan kode (Ctrl+S).
2. Klik **Deploy** > **Manage deployments**.
3. Pilih deployment aktif, lalu klik ikon pensil (**Edit**).
4. Pada kolom **Version**, pilih **New version**.
5. Klik **Deploy**.
   > *Penting: Jika tidak membuat "New version", URL Web App tidak akan menjalankan kode terbaru!*
