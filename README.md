# 🥚 Telur Jagoan — Sistem Operasional & Point of Sale (POS) Toko Telur

**Telur Jagoan** adalah aplikasi web manajemen toko telur terintegrasi yang mencakup **Landing Page**, **Kasir (POS / Point of Sale)**, **Manajemen Pembelian (Kulakan) & Supplier**, **Pengelolaan Stok Otomatis (FIFO & Batch)**, **Pencatatan Keuangan (Arus Kas, Pemasukan, Pengeluaran)**, dan **Laporan Bisnis**.

Dibangun menggunakan **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, dan **Prisma ORM**.

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Arsitektur & Tech Stack](#-arsitektur--tech-stack)
3. [Alur Kerja Sistem (End-to-End Flow)](#-alur-kerja-sistem-end-to-end-flow)
4. [Persyaratan Sistem](#-persyaratan-sistem)
5. [Panduan Instalasi & Setup Lokal](#-panduan-instalasi--setup-lokal)
6. [Konfigurasi Environment](#-konfigurasi-environment)
7. [Akun Pengguna Bawaan (Seed Data)](#-akun-pengguna-bawaan-seed-data)
8. [Panduan Pemakaian Sistem](#-panduan-pemakaian-sistem)
9. [Perintah & Skrip NPM](#-perintah--skrip-npm)
10. [Struktur Direktori Proyek](#-struktur-direktori-proyek)
11. [Peta Dokumentasi Lengkap](#-peta-dokumentasi-lengkap)

---

## ✨ Fitur Utama

- **Landing Page Interaktif**: Beranda promosi modern, responsif mobile, menampilkan informasi produk unggulan, keunggulan, kontak WhatsApp, dan integrasi peta lokasi.
- **Manajemen Pengguna & Hak Akses (RBAC)**:
  - **Owner**: Akses penuh ke seluruh fitur, laporan laba rugi, harga modal (HPP), keuangan, dan pengaturan toko.
  - **Kasir**: Akses fokus pada sesi kasir, transaksi kasir POS, kas masuk/keluar harian, dan retur penjualan.
- **Sesi Kasir (Cash Drawer Management)**: Buka kasir dengan modal awal, pencatatan mutasi kas (kas masuk/keluar), dan rekonsiliasi saat tutup kasir (perhitungan selisih kas fisik vs sistem).
- **Point of Sale (POS) Kasir**:
  - Transaksi cepat dengan perhitungan multi-satuan (Kg, Butir, Tray, Peti, Ikat).
  - Pilihan metode pembayaran: **Cash / Tunai**, **QRIS**, **Transfer Bank**, **Debit**.
  - Cetak struk belanja untuk printer thermal (58mm / 80mm) dan cetak PDF.
  - Dukungan retur dan pembatalan transaksi dengan pengembalian stok dan pembalikan jurnal kas otomatis.
- **Pembelian (Kulakan) & Manajemen Supplier**:
  - Pencatatan pembelian tunai maupun tempo (hutang supplier).
  - Otomatis membuat batch inventaris masuk dan meningkatkan stok secara atomik.
  - Pengingat jatuh tempo hutang (H-7, H-3, H-1, Hari H).
  - Upload bukti pembayaran/faktur supplier.
- **Inventaris & Manajemen Stok Otomatis**:
  - Pengurangan stok menggunakan metode **FIFO (First In, First Out)** berbasis batch kadaluwarsa/masuk.
  - Pencatatan stok rusak / pecah / busuk (*stock damage*) dengan alasan terperinci.
  - Notifikasi stok menipis (*low stock*) dan batch mendekati kadaluwarsa.
- **Pencatatan Keuangan Terintegrasi**:
  - Semua Arus Kas, Pemasukan Lain, dan Pengeluaran Operasional.
  - Rekonsiliasi otomatis dengan sesi kasir aktif.
- **Laporan Komprehensif**: Laporan penjualan, laporan laba rugi, laporan pembelian, laporan stok opname, serta ekspor data ke format **Excel (.xlsx)** dan **PDF**.

---

## 🧱 Arsitektur & Tech Stack

| Komponen | Teknologi | Deskripsi |
|---|---|---|
| **Framework** | Next.js (App Router) | React Server Components, Server Actions, Dynamic Metadata |
| **Bahasa** | TypeScript | Type safety end-to-end |
| **Styling** | Tailwind CSS v4 | Utilitas styling modern dan desain responsif mobile |
| **Database** | PostgreSQL | Relational Database Management System |
| **ORM** | Prisma ORM | Pemodelan data, migrasi, dan type-safe database query |
| **Autentikasi** | NextAuth.js (Auth.js) | JWT session strategy, proteksi route middleware, auto-logout idle 20 menit |
| **Validasi Data** | Zod | Skema validasi konsisten di sisi klien dan server |
| **Cetak Struk** | Native `@media print` | Cetak langsung thermal printer 80mm & PDF printer |
| **Ekspor Data** | SheetJS (`xlsx`) & `@react-pdf/renderer` | Ekspor rekapitulasi data ke format Excel dan PDF |
| **Media Storage** | Local Storage & S3 | Penyimpanan logo toko, foto produk, dan bukti transaksi |

---

## 🔄 Alur Kerja Sistem (End-to-End Flow)

Berikut adalah ringkasan siklus operasional harian toko Telur Jagoan:

```mermaid
flowchart TD
    Start([Mulai]) --> Login[1. Login Akun Owner / Kasir]
    
    %% Alur Owner
    Login -->|Role: OWNER| OwnerDashboard[Dashboard Owner]
    OwnerDashboard --> MasterData[2. Setup Produk, Kategori & Satuan]
    MasterData --> Purchase[3. Input Pembelian / Kulakan Supplier]
    Purchase -->|Stok Bertambah Otomatis| BatchStock[Batch Stok FIFO Terbuat]
    
    %% Alur Kasir
    Login -->|Role: CASHIER| CashierDashboard[Dashboard Kasir]
    CashierDashboard --> OpenSession[4. Buka Sesi Kasir - Input Kas Awal]
    OpenSession --> POS[5. Transaksi Kasir POS]
    BatchStock -.->|Tersedia untuk Dijual| POS
    POS --> Payment{Pilih Pembayaran}
    Payment -->|Tunai / QRIS / Transfer| PrintReceipt[6. Cetak Struk Belanja]
    PrintReceipt -->|Stok Terpotong FIFO| InventoryUpdate[Update Stok & Mutasi Kas]
    
    %% Rekonsiliasi & Keuangan
    InventoryUpdate --> CashMovement[7. Kas Masuk / Kas Keluar / Biaya]
    CashMovement --> CloseSession[8. Tutup Sesi Kasir - Hitung Kas Fisik]
    CloseSession --> FinancialReport[9. Laporan Keuangan & Laba Rugi]
```

### Rincian Alur Operasional:
1. **Alur Pembelian (Kulakan)**:
   - Owner menginput transaksi pembelian telur dari supplier (nama supplier, no. faktur, harga beli per kg/peti/ikat, termin pembayaran).
   - Sistem secara otomatis mencatat pengeluaran keuangan dan membuat **Batch Stok Baru** dengan status aktif.
2. **Alur Buka & Tutup Kasir**:
   - Setiap awal shift, kasir wajib membuka sesi kasir dan menginput saldo uang tunai modal awal (*Opening Cash*).
   - Seluruh transaksi penjualan tunai selama shift akan menambah saldo kas kasir.
   - Di akhir shift, kasir melakukan *Closing Kasir* dengan menghitung uang fisik dan mencatat selisih jika ada.
3. **Alur Penjualan Kasir (POS)**:
   - Kasir memilih produk dan satuan beli pelanggan (misal: 2 kg atau 1 tray).
   - Sistem menghitung konversi berat/jumlah, diskon, dan total harga.
   - Pelanggan membayar, kasir mengonfirmasi, dan sistem mencetak struk belanja.
   - Stok terpotong otomatis dari batch telur paling lama (**FIFO**).
4. **Alur Retur & Pembatalan**:
   - Jika pelanggan mengembalikan telur rusak/pecah, kasir memproses retur.
   - Sistem mengembalikan stok produk (atau dialihkan ke stok rusak) dan mencatat pengembalian dana (*refund*) secara atomik.

---

## 💻 Persyaratan Sistem

Sebelum menjalankan aplikasi, pastikan komputer Anda telah terinstal:
- **Node.js**: Versi `20.x` atau lebih baru
- **NPM**: Versi `10.x` atau lebih baru
- **PostgreSQL**: Versi `15.x` atau lebih baru
- **Git**

---

## 🚀 Panduan Instalasi & Setup Lokal

Ikuti langkah-langkah berikut untuk menginstal dan menjalankan proyek di komputer lokal:

### 1. Clone Repository
```bash
git clone https://github.com/username/telur-jagoan.git
cd telur-jagoan
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variable
Salin file template `.env.example` menjadi `.env.development` (atau `.env`):
```bash
cp .env.example .env.development
```

Buka file `.env.development` dan sesuaikan koneksi database serta kata sandi default:
```env
# Koneksi PostgreSQL
DATABASE_URL="postgresql://postgres:password_anda@localhost:5432/telur_jagoan?schema=public"

# Rahasia Autentikasi (bisa string acak panjang)
SESSION_SECRET="kunci-rahasia-autentikasi-minimal-32-karakter"

# Password Akun Bawaan (untuk proses seed data)
SEED_OWNER_PASSWORD="OwnerPassword123!"
SEED_CASHIER_PASSWORD="KasirPassword123!"

# URL Aplikasi
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Storage Driver (local untuk pengembangan, s3 untuk produksi)
STORAGE_DRIVER="local"
```

### 4. Setup Database & Jalankan Migrasi
Pastikan database PostgreSQL sudah dibuat (misal: `telur_jagoan`), kemudian jalankan perintah migrasi skema database Prisma:
```bash
# Generate Prisma client
npm run prisma:generate

# Jalankan migrasi schema ke PostgreSQL
npx prisma migrate dev --name init

# Atau jika ingin mengeksekusi DDL database langsung:
# File DDL lengkap tersedia di database/schema.sql
```

### 5. Isi Data Awal (Database Seeding)
Jalankan skrip seed untuk membuat akun Owner & Kasir bawaan, kategori produk, satuan, serta dummy data awal:
```bash
npm run prisma:seed
```

### 6. Jalankan Server Pengembangan
```bash
npm run dev
```

Buka browser Anda di [**http://localhost:3000**](http://localhost:3000).

---

## 🔑 Akun Pengguna Bawaan (Seed Data)

Setelah menjalankan `npm run prisma:seed`, akun berikut siap digunakan untuk login:

| Peran | Username | Email | Password Default | Akses |
|---|---|---|---|---|
| **Owner** | `owner` | `owner@telurjagoan.local` | Sesuai nilai `SEED_OWNER_PASSWORD` | Seluruh Dashboard, Laporan, Keuangan, Master Data |
| **Kasir 1** | `kasir` | `kasir@telurjagoan.local` | Sesuai nilai `SEED_CASHIER_PASSWORD` | Menu Kasir, Buka/Tutup Kas, Penjualan POS, Retur |
| **Kasir 2** | `kasir2` | `kasir2@telurjagoan.local` | Sesuai nilai `SEED_CASHIER_PASSWORD` | Menu Kasir Cabang |

> ⚠️ **Catatan Keamanan**: Selalu ganti password default saat melakukan deployment ke lingkungan produksi!

---

## 📖 Panduan Pemakaian Sistem

### A. Panduan untuk Owner (Pemilik Toko)
1. **Login**: Masuk menggunakan akun `owner` di halaman `/login`.
2. **Setup Informasi Toko**: Masuk ke menu **Pengaturan** untuk mengatur nama toko, alamat, kontak WhatsApp, nomor telepon, logo toko, dan footer struk belanja.
3. **Kelola Produk & Kategori**:
   - Tambahkan kategori (misal: *Telur Ayam*, *Telur Bebek*, *Telur Puyuh*).
   - Masukkan produk telur dan tentukan konversi satuan (misal: 1 Peti = 10 Kg, 1 Tray = 30 Butir).
4. **Input Pembelian (Kulakan)**:
   - Buka menu **Pembelian** > klik **Tambah Pembelian**.
   - Masukkan nama supplier, item produk, jumlah, harga beli, dan metode pembayaran (Lunas atau Hutang/Tempo).
   - Stok akan bertambah otomatis ke dalam inventaris batch.
5. **Monitoring Keuangan & Laba Rugi**:
   - Buka menu **Keuangan** untuk melihat seluruh pemasukan dan pengeluaran.
   - Buka menu **Laporan** untuk mencetak laporan omset harian/bulanan atau mengunduh rekapan Excel.

### B. Panduan untuk Kasir (Staff POS)
1. **Login**: Masuk menggunakan akun `kasir` di halaman `/login`.
2. **Buka Sesi Kasir**:
   - Saat awal shift, klik **Buka Kasir**.
   - Masukkan jumlah uang modal awal (*cash drawer opening*) yang ada di laci kasir.
3. **Melakukan Transaksi Penjualan**:
   - Buka menu **Transaksi Baru** di kasir.
   - Pilih produk telur dan satuan yang dibeli pelanggan (Kg / Butir / Tray / Peti).
   - Masukkan jumlah dan diskon (jika ada).
   - Pilih metode pembayaran:
     - **Tunai**: Masukkan uang yang diterima, sistem menghitung uang kembalian.
     - **QRIS / Transfer**: Konfirmasi status transfer sukses.
   - Klik **Bayar & Cetak Struk** untuk mencetak struk transaksi ke printer thermal.
4. **Mutasi Kas Kecil**:
   - Jika ada pengeluaran kas kecil (misal: beli kantong plastik/es batu), catat melalui tombol **Kas Keluar**.
5. **Tutup Sesi Kasir**:
   - Di akhir shift, klik **Tutup Kasir**.
   - Masukkan jumlah total uang fisik yang dihitung di laci kasir.
   - Sistem akan membandingkan dengan total uang yang tercatat pada sistem dan menampilkan selisih (jika ada).

---

## 🛠️ Perintah & Skrip NPM

Berikut daftar perintah yang dapat dijalankan di terminal:

```bash
# Menjalankan aplikasi
npm run dev              # Menjalankan development server (Next.js)
npm run build            # Membuat production build
npm run start            # Menjalankan production server
npm run lint             # Menjalankan pemeriksaan ESLint

# Database & Prisma
npm run prisma:generate  # Generate TypeScript Prisma Client
npm run prisma:validate  # Memvalidasi file schema.prisma
npm run prisma:migrate   # Menjalankan migrasi database di lokal
npm run prisma:seed      # Mengisi data dummy / master awal
npm run prisma:studio    # Membuka Web GUI Prisma Studio (http://localhost:5555)

# Skrip Verifikasi Bisnis
npm run verify:master-data    # Validasi aturan master data
npm run verify:purchases      # Validasi flow pembelian
npm run verify:cash-sessions  # Validasi sesi kasir
npm run verify:pos            # Validasi kalkulasi POS
npm run verify:sale-reversal  # Validasi pembatalan & retur penjualan
```

---

## 📁 Struktur Direktori Proyek

```text
telur-jagoan/
├── database/                   # Skema SQL DDL mentah (PostgreSQL)
│   └── schema.sql              # Skema final lengkap PostgreSQL
├── docs/                       # Dokumentasi spesifikasi arsitektur & PRD
│   ├── PRD.md                  # Product Requirements Document
│   ├── BUSINESS_FLOWS.md       # Alur bisnis mendalam
│   ├── DATABASE_SCHEMA.md      # Rincian tabel & kolom
│   └── ARCHITECTURE.md         # Arsitektur sistem & deployment
├── prisma/                     # Konfigurasi Prisma ORM
│   ├── schema.prisma           # Skema model Prisma
│   └── seed.ts                 # Skrip seeder database
├── public/                     # Asset statis (gambar, ikon, logo)
│   └── uploads/                # Direktori upload media lokal
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Route group autentikasi (/login)
│   │   ├── (dashboard)/        # Route group area dashboard (Owner & Kasir)
│   │   │   ├── dashboard/      # Halaman utama Owner
│   │   │   ├── kasir/          # Halaman utama Kasir & POS
│   │   │   ├── produk/         # Manajemen Produk & Kategori
│   │   │   ├── pembelian/      # Manajemen Pembelian
│   │   │   ├── penjualan/      # Manajemen Riwayat Penjualan
│   │   │   ├── stok/           # Inventaris & Stok Opname
│   │   │   ├── keuangan/       # Arus Kas, Pemasukan, Pengeluaran
│   │   │   ├── laporan/        # Laporan & Ekspor
│   │   │   └── pengaturan/     # Pengaturan Toko & Pengguna
│   │   ├── api/                # API Route Handlers
│   │   ├── globals.css         # Styling global Tailwind CSS v4
│   │   ├── icon.tsx            # Favicon dinamis Telur Jagoan
│   │   ├── layout.tsx          # Root layout HTML
│   │   └── page.tsx            # Landing page publik
│   ├── components/             # Reusable React components
│   │   ├── landing/            # Komponen landing page (Hero, About, dll)
│   │   ├── layout/             # Shell dashboard, Navbar, Footer
│   │   └── ui/                 # Komponen antarmuka (Button, Modal, dll)
│   ├── data/                   # Menu navigasi & konstanta
│   ├── features/               # Modul logika bisnis berbasis fitur
│   ├── lib/                    # Library helper, otentikasi, utilitas
│   └── server/                 # Server actions, Zod schemas, dan services
├── package.json
└── tsconfig.json
```

---

## 📚 Peta Dokumentasi Lengkap

Jika Anda membutuhkan detail teknis mendalam, silakan baca dokumentasi spesifik berikut:

- [`docs/PRD.md`](docs/PRD.md): Rincian kebutuhan fungsional, hak akses peran, dan batasan sistem.
- [`docs/BUSINESS_FLOWS.md`](docs/BUSINESS_FLOWS.md): Seluruh diagram alur transaksi, formula perhitungan laba kotor, dan aturan pembatalan.
- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md): Dokumentasi ERD, daftar kolom tabel, indeks, dan relasi.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Panduan deployment, backup berkala, dan konfigurasi server.

---

## 📄 Lisensi

Hak Cipta © 2026 **Telur Jagoan**. Seluruh hak cipta dilindungi undang-undang.
