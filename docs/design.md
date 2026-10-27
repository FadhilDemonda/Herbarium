# Design PRD: Herbarium

Pelengkap `docs/PRD.md`. Jika ada konflik soal perilaku, PRD menang; soal tampilan, dokumen ini menang.

## 1. Arah Desain
**Kata kunci:** tenang, lega, fokus pada kode, hangat, alami.
Antarmuka terasa seperti buku catatan di meja kayu: latar krem hangat, hijau hutan sebagai aksen utama, terakota sebagai aksen sekunder. Tanpa gradasi mencolok dan tanpa dekorasi yang tidak punya fungsi.

### Prinsip
1. **Konten dulu:** judul dan SQL adalah bintangnya; UI mundur ke belakang.
2. **Lega, bukan kosong:** whitespace besar, hierarki jelas, satu aksi utama per area.
3. **Warna dengan makna:** hijau = aksi utama/sukses, terakota = penanda kategori, merah bata = destruktif. Selebihnya netral.
4. **Datar dan halus:** border tipis menggantikan bayangan; bayangan hanya untuk elemen melayang (modal, palette, toast).
5. **Cepat terasa:** transisi singkat, tanpa animasi dekoratif.

## 2. Design Tokens

### 2.1 Warna (Light)
| Token | Hex | Pemakaian |
|---|---|---|
| `--bg` | `#F7F5EF` | Latar halaman (krem hangat) |
| `--surface` | `#FDFCF8` | Kartu, panel, modal |
| `--surface-2` | `#EFEDE3` | Hover, input, segmented control |
| `--border` | `#E2DFD2` | Garis pemisah, border kartu |
| `--text` | `#1F2A24` | Teks utama |
| `--text-muted` | `#5E6B62` | Teks sekunder, metadata |
| `--primary` | `#3F6B4F` | Tombol utama, link, fokus aktif |
| `--primary-hover` | `#345A42` | Hover tombol utama |
| `--primary-soft` | `#E3EDE4` | Latar item aktif, badge jenis |
| `--accent` | `#B86B4B` | Teks badge kategori (terakota) |
| `--accent-soft` | `#F3E4DA` | Latar badge kategori |
| `--success` | `#4C7A58` | Toast sukses |
| `--warning` | `#A87B1F` | Peringatan |
| `--danger` | `#A8432F` | Hapus, error |
| `--ring` | `#6F9A7C` | Focus ring (2px, offset 2px) |

### 2.2 Warna (Dark)
| Token | Hex |
|---|---|
| `--bg` | `#121A15` |
| `--surface` | `#19231D` |
| `--surface-2` | `#212D26` |
| `--border` | `#2C3A32` |
| `--text` | `#E8EDE4` |
| `--text-muted` | `#9BAA9F` |
| `--primary` | `#8DBB98` (teks di atasnya `#0F1A13`) |
| `--primary-hover` | `#A3CCAD` |
| `--primary-soft` | `#223428` |
| `--accent` | `#D99A7A` |
| `--accent-soft` | `#3A2A22` |
| `--success` | `#7FBF8E` |
| `--warning` | `#D9B35A` |
| `--danger` | `#E0846F` |
| `--ring` | `#6F9A7C` |

Dark mode bukan inversi: latar hijau-hitam kehutanan, bukan abu netral.

### 2.3 Tema Syntax SQL
| Elemen | Light | Dark |
|---|---|---|
| Latar blok kode | `#F1EFE6` | `#0F1612` |
| Keyword | `#3F6B4F` | `#8DBB98` |
| Function | `#2F6F6B` | `#7CC3BC` |
| String | `#A4573A` | `#D99A7A` |
| Number | `#9A6B14` | `#D9B35A` |
| Comment | `#8A9488` (italic) | `#6E7C72` (italic) |
| Operator/punctuation | `#5E6B62` | `#9BAA9F` |
| Identifier | `--text` | `--text` |

### 2.4 Tipografi
- **UI:** `Plus Jakarta Sans` (fallback `Inter`, `system-ui, sans-serif`).
- **Kode:** `JetBrains Mono` (fallback `ui-monospace, Menlo, monospace`), ligatures dimatikan.
- Maksimal 2 font family, `font-display: swap`.

| Peran | Ukuran / Line-height | Weight |
|---|---|---|
| Page title | 28 / 36 | 600 |
| Section title | 20 / 28 | 600 |
| Card title | 16 / 24 | 600 |
| Body | 14 / 22 | 400 |
| Caption/metadata | 12 / 18 | 500 |
| Kode | 13 / 21 | 400 |

### 2.5 Spacing, Radius, Elevasi, Motion
- **Spacing (skala 4px):** 4, 8, 12, 16, 24, 32, 48, 64.
- **Radius:** 6 (input, chip), 10 (kartu, tombol), 16 (modal), full (badge).
- **Border:** 1px `--border`.
- **Bayangan:** `--shadow-float: 0 8px 30px rgb(31 42 36 / 0.10)` (dark: opasitas 0.4), hanya untuk modal, palette, toast, dropdown.
- **Motion:** 150ms `ease-out` untuk hover/fokus; 200ms untuk modal/toast (fade + translateY 4px). Matikan transisi gerak saat `prefers-reduced-motion`.

## 3. Layout

### 3.1 Header (sticky, 64px)
- Kiri: logo daun + wordmark **Herbarium**.
- Tengah: kolom cari (placeholder "Cari query…  Ctrl K").
- Kanan, **belum login:** toggle tema + tombol **Masuk**.
- Kanan, **sudah login:** toggle tema + tombol **+ Tambah** + username (menu kecil berisi **Keluar**).

### 3.2 Desktop (≥ 1024px)
- Lebar maks konten 1200px, tengah; padding horizontal 32px.
- **Sidebar kiri (220px):** daftar kategori dengan jumlah query. Item aktif memakai `--primary-soft`.
- **Area utama:** di atas, segmented control jenis (**Semua / Query / Dashboard**) dan teks "N query" dengan tombol Reset bila ada filter. Di bawahnya grid kartu 2 kolom (gap 16px).

### 3.3 Tablet (640–1023px)
- Sidebar menjadi baris chip kategori yang bisa digulir. Grid 2 kolom, lalu 1 kolom di bawah 768px.

### 3.4 Mobile (< 640px)
- Padding 16px; header ringkas (logo, ikon cari, ikon tema, ikon akun/Masuk).
- Filter kategori dan jenis di bottom sheet; **+ Tambah** menjadi tombol bulat melayang di kanan bawah (hanya saat login).
- Tombol Salin selalu terlihat tanpa hover; target sentuh ≥ 44px.

### 3.5 Detail Query
Panel geser dari kanan (desktop, lebar 720px) atau layar penuh (mobile). Urutan: judul → badge kategori + badge jenis → blok SQL → metadata (`updated_at`, `updated_by`) → aksi **Edit** dan **Hapus** (hanya saat login).

## 4. Komponen

| Komponen | Spesifikasi |
|---|---|
| **Kartu query** | Latar `--surface`, border 1px, radius 10, padding 20. Isi: judul (card title), badge kategori, badge jenis, cuplikan SQL 3 baris (monospace, redup), tombol salin di pojok kanan atas. Hover: border berubah ke `--primary` 40%, tanpa bayangan. Klik kartu membuka detail. |
| **Badge kategori** | Latar `--accent-soft`, teks `--accent`, 12px/500, radius full. |
| **Badge jenis** | `Query`: latar `--surface-2`, teks `--text-muted`. `Dashboard`: latar `--primary-soft`, teks `--primary`. Selalu disertai teks, tidak hanya warna. |
| **Segmented control (jenis)** | 2 atau 3 segmen dalam wadah `--surface-2`, radius 10; segmen aktif `--surface` + border. Dipakai di filter (Semua/Query/Dashboard) dan di form (Query/Dashboard). |
| **Tombol utama** | Latar `--primary`, teks putih (dark: `#0F1A13`), tinggi 40, radius 10. |
| **Tombol sekunder** | Transparan, border `--border`, hover `--surface-2`. |
| **Tombol ikon** | 36×36, hover `--surface-2`, wajib `aria-label`. |
| **Tombol destruktif** | Teks/border `--danger`; versi solid hanya di dialog konfirmasi hapus. |
| **Input / select / textarea** | Tinggi 40, latar `--surface`, border `--border`; fokus: border `--primary` + ring. Label di atas, pesan error di bawah (merah bata + ikon). |
| **Blok SQL** | Latar sesuai 2.3, radius 10, padding 16, scroll horizontal, nomor baris aktif di halaman detail. Tombol **Salin** di kanan atas; setelah diklik berubah menjadi ikon centang + "Tersalin" selama 1,5 detik. |
| **Command palette (Ctrl/Cmd+K)** | Modal tengah, lebar 600, radius 16, `--shadow-float`, backdrop `rgb(18 26 21 / 0.45)`. Input besar tanpa border, hasil menampilkan judul + badge kategori, item aktif `--primary-soft`, hint (↑↓ Enter Esc) di footer. |
| **Dialog Login** | Modal kecil (360): judul "Masuk", input username, input password (tombol lihat/sembunyi), tombol **Masuk**. Error inline: "Username atau password salah", "Terlalu banyak percobaan, coba lagi nanti". Enter mengirim form. Muncul otomatis bila aksi tulis ditolak karena sesi habis. |
| **Modal Tambah/Edit** | Lebar 640, radius 16. **Hanya 4 isian:** Judul, Kategori (dropdown + opsi "Tambah kategori baru"), Jenis (segmented control Query/Dashboard), Query SQL (textarea monospace, tinggi min 240). Footer lengket: Batal + Simpan. Esc menutup, fokus terkunci. |
| **Dialog Hapus** | Modal kecil: nama query, teks "Tindakan ini tidak bisa dibatalkan", tombol Batal dan **Hapus** (solid `--danger`). |
| **Toast** | Kanan bawah (mobile: tengah bawah), lebar maks 360, ikon + teks pendek, hilang otomatis 2–3 detik; error bertahan lebih lama dan bisa ditutup. |
| **Skeleton** | Blok `--surface-2` dengan shimmer halus, bentuk meniru kartu. |
| **Empty state** | Ilustrasi garis daun/ranting (1 warna `--primary` 60%), judul, satu kalimat, satu tombol (mis. "Reset filter"). |
| **Error state** | Ikon peringatan, pesan manusiawi, tombol "Coba lagi". |

## 5. Ikonografi dan Ilustrasi
- Satu set ikon bergaya garis (`lucide-react`), stroke 1.75, ukuran 16/20.
- Ilustrasi hanya di empty/error state; garis tipis, satu warna, tanpa gradasi.
- Logo: wordmark teks + simbol daun minimal (SVG inline, `currentColor`). Tagline: "Pustaka query Superset".

## 6. Aksesibilitas Visual
- Kontras teks normal ≥ 4.5:1, teks besar/ikon penting ≥ 3:1. Nilai warna di atas adalah target rancangan, **belum diukur**; verifikasi semua pasangan token dengan alat cek kontras sebelum M3 selesai.
- Status tidak boleh hanya dibedakan warna: sertakan ikon atau teks.
- Focus ring selalu terlihat (2px `--ring`, offset 2px); jangan `outline: none` tanpa pengganti.
- Ukuran teks minimum 12px; UI tetap rapi pada zoom 200%.
- Dukung `prefers-color-scheme` dan `prefers-reduced-motion`.

## 7. Implementasi
- Token sebagai CSS variables di `src/styles/tokens.css` (`:root` dan `[data-theme="dark"]`). Komponen tidak boleh memakai hex langsung.
- Tema lewat atribut `data-theme` pada `<html>`; default mengikuti sistem, pilihan disimpan di `localStorage`. Cegah flash tema dengan skrip inline kecil di `index.html`.
- Gaya: `tokens.css`, `base.css` (reset + tipografi), lalu CSS Modules per komponen (atau Tailwind bila dipilih; token tetap sumber tunggal).
- Syntax highlighting memakai tema kustom dari 2.3, bukan tema bawaan library.

## 8. Acceptance Criteria Desain
| # | Kriteria |
|---|---|
| D1 | Seluruh warna berasal dari token; tidak ada hex di file komponen. |
| D2 | Light dan dark mode konsisten di semua komponen dan state. |
| D3 | Layout rapi di 360px, 768px, 1280px tanpa scroll horizontal pada halaman. |
| D4 | Pasangan teks/latar lolos kontras WCAG AA (terukur). |
| D5 | Semua elemen interaktif punya state hover, fokus, aktif, dan nonaktif. |
| D6 | Loading, empty, dan error state tampil sesuai gaya di atas. |
| D7 | Salin SQL memberi umpan balik ganda (tombol berubah + toast) dalam < 200ms. |
| D8 | Tidak ada animasi gerak saat `prefers-reduced-motion: reduce`. |
| D9 | Tombol Tambah/Edit/Hapus hanya terlihat saat login; dialog login muncul bila sesi habis. |
| D10 | Form tambah/edit hanya berisi 4 isian. |

## 9. Di Luar Lingkup
- Kustomisasi tema selain terang/gelap.
- Animasi kompleks, ilustrasi berwarna penuh, foto.
- Editor SQL kaya fitur (autocomplete, linting); cukup textarea monospace.
- Halaman daftar akun, profil, atau ganti password.

## 10. Pertanyaan Terbuka
- Logo final (sementara: wordmark + simbol daun).
- Tampilan default daftar: kartu (asumsi) atau list padat?
