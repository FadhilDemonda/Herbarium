# Perbaikan audit UI nomor 4 sampai 12

## Intent dan scope

Permintaan pengguna: perbaiki semua temuan #4 sampai #12 pada `anti-slop/audit-001-2026-11-19.md`. Tujuannya memulihkan pencarian mobile, akses aksi, keyboard, kontras, feedback kegagalan, dan konsistensi tema. Nomor #1, #2, #3, dan #13 tetap di luar scope.

Pertahankan React/JavaScript, bahasa UI Indonesia, warna krem/hijau, font, ikon, isi SQL, struktur data, dan kontrak GAS. Surface tetap Operate, ENERGY 1 / RHYTHM 1 / MOTION 1. Tidak membuat aset, fitur backend, akun, role, integrasi Superset, atau preview SQL baru.

## Approaches

1. **Patch terpisah per dialog:** perubahan lokal lebih sedikit, tetapi menduplikasi focus trap, restore focus, scroll lock, dan pengelolaan modal bertumpuk pada enam lokasi. Tidak direkomendasikan.
2. **Primitive dialog bersama berbasis HTML dialog native:** browser menangani modal focus/inert/top layer; satu wrapper React mengatur open, cancel, close, backdrop, dan busy state. Direkomendasikan karena tidak membutuhkan library UI baru dan mengatasi akar masalah yang sama pada seluruh dialog.
3. **Library dialog baru:** perilaku aksesibel tersedia, tetapi menambah dependency produksi untuk kebutuhan yang dapat ditangani platform. Tidak direkomendasikan untuk scope ini.

Pengguna menyetujui rancangan dan eksekusi Native melalui jawaban `1` setelah rencana ditawarkan.

## Rancangan perubahan

- **#4, #5, #10:** tombol cari ringkas pada header mobile membuka palette yang sama. Toolbar dan tab master membungkus tanpa overflow halaman. Tabel master mempertahankan semantik tabel dan memakai region scroll horizontal bernama, dapat difokuskan, dengan petunjuk scroll saat diperlukan. Seluruh kontrol mobile mempunyai hit area minimal 44x44px. Header ringkas mempertahankan ruang bagi pencarian, tema, dan akun.
- **#7:** satu komponen Modal untuk login, palette, drawer, form query, konfirmasi hapus, dan dialog master. Fokus masuk/terkunci/dikembalikan; Escape hanya menutup dialog teratas; body scroll tetap terkunci selama ada modal. Saat permintaan tulis berlangsung, penutupan tidak membuang state aksi. Menu ekspor/pengguna mendapatkan navigasi panah, Home/End, Escape, dan restore focus.
- **#8:** article dan tr tetap semantik, bukan button yang membungkus button. Tombol detail native membuka query; klik area kartu/baris tetap tersedia tanpa menangkap tombol anak.
- **#9:** label terlihat untuk pencarian dan nama master baru; combobox/listbox tersambung melalui ARIA; state grid/tabel memakai aria-pressed. Tab master terhubung ke panel dan mendukung keyboard; dialog memiliki nama. Error field terhubung ke input terkait.
- **#6, #12:** warna teks dan danger foreground diperbaiki melalui token dan diukur pada kedua tema. Badge kartu memakai preset bersama, bukan palet paralel. Permukaan statis datar, shadow hanya untuk lapisan mengambang. Tidak mengubah informasi, urutan, klaim, judul, ataupun isi kartu yang berada di luar scope.
- **#11:** kegagalan hapus ditangkap, ditampilkan dalam alert pada dialog, dan dapat dicoba ulang tanpa kehilangan target. Tidak ada unhandled rejection.

## Alasan desain

- Krem/hijau dan font tetap: identitas sudah sesuai brief, bukan objek redesign.
- Layout mobile reflow dan tabel lokal yang dapat digulir: mempertahankan semua aksi tanpa menyembunyikan kolom aksi atau membuat layout data kedua.
- Hit area 44px: memenuhi standar proyek tanpa membesarkan ikon.
- Native dialog: menghindari enam implementasi fokus yang berbeda.
- Shadow selektif: menunjukkan lapisan yang mengambang, bukan dekorasi pada seluruh halaman.
- Token badge bersama: perubahan kontras dan tema menjangkau setiap pemakaian preset.

## Verifikasi

Tambahkan `@playwright/test` sebagai dependency pengembangan saja untuk regresi browser nyata: ukuran layout, clipboard, modal bertumpuk, fokus, dan keyboard tidak dapat dibuktikan oleh lint atau DOM tanpa layout. Pengujian memakai data repo yang sudah ada, token placeholder, dan intercept GAS; tidak menulis data ke layanan nyata.

Tulis tes yang gagal sebelum tiap kelompok perbaikan. Uji kedua tema pada 360/768/1280px dan batas sempit 320px, menu, modal bertumpuk, Enter/Space, retry error, target sentuh, serta rasio kontras. Jalankan seluruh suite, lint, build, detector, dan inspeksi screenshot. Catat keterbatasan perangkat fisik/engine selain Chromium, bukan mengklaim semuanya diuji.

## Status

Scope dan rancangan teknis disetujui pengguna. Implementasi mengikuti rencana terkait; bukti verifikasi dicatat pada laporan tindak lanjut.
