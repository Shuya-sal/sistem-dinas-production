# Sistem Informasi Perjalanan Dinas & Manajemen Staf

Aplikasi sistem informasi perjalanan dinas berbasis web PHP Native dengan fitur manajemen penugasan, master data pegawai, forum internal, dan arsitektur pengamanan Cross-Site Request Forgery (CSRF).

## Fitur Utama

- Autentikasi & Otorisasi: Login berbasis NIP atau Nama Lengkap dengan proteksi brute force (lockout otomatis) dan password hashing.
- Pengamanan Siber CSRF: Validasi token anti-CSRF pada semua request mutasi data (POST, PUT, PATCH, DELETE) dengan pengecualian otomatis untuk request read-only (GET).
- Manajemen Penugasan Dinas: Pengelolaan surat tugas, anggota perjalanan dinas, perhitungan durasi, anggaran biaya, dan lampiran dokumentasi.
- Master Data Pegawai: Manajemen dewan, pejabat struktural, staf teknis, serta hak akses dan lencana profil.
- Forum Komunikasi Internal: Forum interaktif antar pegawai dengan dukungan balasan bertingkat, reaksi, mention, dan stiker.
- Otomatisasi Dokumen Dinas: Generator cetak berkas rill, kuitansi, rincian biaya, dan surat tugas.
- Sinkronisasi Realtime: Notifikasi status online dan pesan privat melalui integrasi Pusher.

---

## Arsitektur Keamanan CSRF

Sistem menerapkan proteksi CSRF berlapis untuk mencegah serangan pemalsuan request lintas situs:

1. Pembentukan Token Unik:
   - Server membuat token kriptografis acak (`bin2hex(random_bytes(32))`) saat login berhasil (`PHP/api_login.php`).
   - Token disimpan dalam `$_SESSION['csrf_token']` dan disinkronkan ke cookie `csrf_token` (SameSite=Lax).
   - Client menyimpan token di `sessionStorage` dengan fallback ke cookie saat membuka tab baru.

2. Pencegatan Client-Side (`Javascript/gembok.js`):
   - Global fetch interceptor otomatis menyuntikkan header HTTP `X-CSRF-Token` pada setiap request mutasi (`POST`, `PUT`, `PATCH`, `DELETE`).
   - Request pembacaan data (`GET`) tidak dibebani token agar proses pemuatan data berlangsung cepat tanpa risiko blocking.

3. Validasi Server-Side Global (`PHP/koneksi.php`):
   - Titik sentral pemeriksaan CSRF berada di `PHP/koneksi.php` yang dimuat oleh setiap file API.
   - Pengecekan token menggunakan fungsi aman dari timing-attack (`hash_equals`).
   - Endpoint login (`api_login.php`), logout (`api_logout.php`), dan detak jantung (`ping.php`) dikecualikan dari pemeriksaan token mutasi.
   - Deteksi otomatis sesi kedaluwarsa menghasilkan status HTTP 401 (`SESSION_EXPIRED`) yang secara otomatis mengarahkan user kembali ke halaman login.

---

## Tech Stack

- Backend: PHP Native (MySQLi Prepared Statements)
- Database: MySQL / MariaDB (`sistem_dinas.sql`)
- Frontend: HTML5, Vanilla JavaScript, CSS3
- Event Driver: Pusher Channels API

---

## Struktur Direktori

```text
sistem-dinas/
├── CSS/                  # Stylesheet antarmuka aplikasi
├── Javascript/           # Logika interaktif client-side
│   ├── Cetak/            # Modul template cetak surat dinas
│   └── gembok.js         # Fetch interceptor, SPA router, dan keamanan CSRF
├── PHP/                  # Backend API endpoints
│   ├── koneksi.php       # Handler database, audit logger, dan gatekeeper CSRF
│   ├── api_login.php     # Autentikasi dan penerbitan CSRF token
│   ├── api_logout.php    # Terminasi sesi server
│   ├── ping.php          # Health check, detak online, dan sinkronisasi token
│   ├── pusher_helper.php # Helper integrasi Pusher
│   ├── api_dashboard.php # Statistik dan metrik kegiatan
│   ├── api_forum.php     # Endpoint diskusi forum dan obrolan
│   ├── api_pegawai.php   # Endpoint master data pegawai
│   ├── api_penugasan.php # Endpoint transaksi penugasan dinas
│   └── api_tujuan.php    # Endpoint master tujuan dan pagu biaya
├── backupcode_coding-high/ # Arsip cadangan kode pra-modifikasi
├── *.html                # Tampilan halaman antarmuka web
└── sistem_dinas.sql      # Skema tabel dan data awal database
```

---

## Panduan Instalasi

### 1. Unduh / Kloning Repository
```bash
git clone https://github.com/Shuya-sal/sistem-dinas.git
cd sistem-dinas
```

### 2. Konfigurasi Database
1. Buat database pada server MySQL / MariaDB:
   ```sql
   CREATE DATABASE sistem_dinas;
   ```
2. Impor struktur dan data awal:
   ```bash
   mysql -u root -p sistem_dinas < sistem_dinas.sql
   ```

### 3. Konfigurasi Koneksi PHP
Sesuaikan parameter koneksi database pada file `PHP/koneksi.php`:
```php
$host = "localhost";
$user = "root";
$pass = "";
$db   = "sistem_dinas";
```

### 4. Menjalankan Aplikasi
Salin seluruh berkas ke direktori web server (misalnya `/var/www/html/sistem-dinas/` atau `htdocs/sistem-dinas/`), kemudian buka di browser:
```text
http://localhost/sistem-dinas/
```
