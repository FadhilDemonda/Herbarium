# Panduan Penyiapan Google Apps Script (Backend Herbarium)

Dokumen ini menjelaskan langkah-langkah lengkap untuk menyiapkan Google Sheets sebagai basis data dan Google Apps Script (GAS) sebagai Web API backend Herbarium.

---

> [!CAUTION]
> **Peringatan Keamanan Penting**:
> Google Spreadsheet ini **HANYA BOLEH DIAKSES OLEH ADMIN**. Jangan pernah membagikan akses Spreadsheet (Share/Bagikan) kepada pengguna umum atau publik, karena sheet `users` memuat password akun editor dalam format teks biasa (plain text).

---

## 1. Membuat Google Spreadsheet

1. Buka [Google Sheets](https://sheets.new) dan buat Spreadsheet baru dengan judul **Herbarium Database**.
2. Spreadsheet ini menggunakan 5 tab sheet. Dua sheet inti dibuat manual; tiga master sheet dibuat otomatis saat `importBatch()` dijalankan.

### A. Sheet `queries`
Buat header di baris ke-1 (Row 1):
| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| `id` | `title` | `category` | `type` | `installation` | `sql_query` | `created_at` | `updated_at` | `updated_by` |

*Keterangan kolom:*
- `id`: ID unik query (`qry_...`)
- `title`: Judul query (maks 150 karakter)
- `category`: Kategori (mis. `Query Permintaan Dataset`, `Query Superset`, dll)
- `type`: Jenis query (mis. `Query`, `Dashboard`, dll)
- `installation`: Unit layanan terkait (mis. `Rawat Jalan`, `IGD`, atau `Umum / Semua Unit`)
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
- `password`: buat password kuat dan unik yang tidak dipakai pada layanan lain
- `active`: `TRUE`

*Catatan:*
- Akun dengan `active` selain `TRUE` (misal `FALSE`) akan ditolak saat login.
- Penambahan atau penghapusan akun dilakukan langsung di sheet `users` ini oleh admin.

### C. Sheet `categories`, `types`, dan `installations` (Otomatis Diinisialisasi)
Ketiga sheet master ini **dibuat dan diisi nilai awal saat `importBatch()` dijalankan**:
- Header: `id`, `name`, `description`, `color`, `sort_order`, `created_at`, `updated_at`, `updated_by`
- Nilai `color`: pilihan preset warna (`terracotta`, `forest`, `teal`, `amber`, `berry`, `slate`, `neutral`).
- Saat sebuah master diubah namanya di Master Data, seluruh query yang menggunakannya otomatis diperbarui (*cascade update*). Jika dihapus, query terkait dialihkan ke kategori `'Lainnya'`, jenis `'Query'`, atau instalasi `'Umum / Semua Unit'`.

---

## 2. Memasang Kode di Google Apps Script

1. Di menu atas Spreadsheet, klik **Extensions (Ekstensi)** > **Apps Script**.
2. Beri nama proyek: **Herbarium Backend**.
3. Buka file `Code.gs`, hapus kode bawaan, dan tempelkan seluruh isi dari `apps-script/Code.gs` pada repositori ini.
4. Klik ikon simpan (Save / Ctrl+S).

---

## 3. Impor Data Awal (`importBatch`)

Fungsi `importBatch()` menyiapkan header sheet `queries`, membuat master awal, dan mereset cache. Fungsi ini tidak mengimpor isi `data/queries.json`; impor data awal harus dilakukan oleh admin dari sumber yang sudah ditinjau.

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
6. Buka kembali Google Sheets dan pastikan kelima sheet tersedia. Setelah itu, impor query yang telah ditinjau ke sheet `queries` dengan tetap memakai header yang tercantum di atas.

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
