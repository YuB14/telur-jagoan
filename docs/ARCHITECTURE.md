# Arsitektur Teknis — Telur Jagoan

Dokumen ini menjelaskan arsitektur teknis proyek Telur Jagoan: teknologi yang digunakan, struktur folder Next.js, strategi testing, deployment, backup/disaster recovery, konfigurasi environment variable, serta aspek non-fungsional (SEO, accessibility, optimasi gambar, dan desain responsif).

---

## Revisi Arsitektur Produk (2026-08-07)

Struktur App Router mengikuti navigasi terbaru: Penjualan dan Pembelian/Kulakan masing-masing satu area dengan tabel, detail, cetak, pembatalan/retur atau tambah transaksi. Supplier diakses inline dari form pembelian; Pelanggan hanya data internal. Keuangan memiliki tiga area CRUD, sedangkan Landing page ditunda sampai paling akhir. Semua aksi pembatalan/retur dan perubahan stok/keuangan melewati server action/domain service dengan Prisma transaction dan validasi Zod.

## 1. Teknologi yang Digunakan

| Bagian | Teknologi |
|---|---|
| Framework | Next.js App Router |
| Bahasa | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma ORM |
| Validasi | Zod |
| Autentikasi | NextAuth.js (Auth.js) dengan strategi session/JWT |
| Grafik | Recharts |
| Cetak struk | HTML dan CSS `@media print`, dicetak lewat jendela popup |
| Ekspor Excel | SheetJS (`xlsx`) |
| Ekspor PDF | `@react-pdf/renderer` |
| Deployment | Vercel atau VPS |
| Penyimpanan gambar | Object storage atau cloud storage |

### Database yang Direkomendasikan

Database yang direkomendasikan adalah **PostgreSQL** karena mendukung transaksi database, relasi yang kuat, constraint, dan cocok digunakan bersama Prisma ORM.

Alternatifnya adalah **MySQL** apabila hosting yang tersedia hanya mendukung MySQL.

### Library Ekspor Data

PDF dan Excel adalah format file yang berbeda sehingga tetap memerlukan satu library khusus untuk masing-masing format (tidak ada satu library yang menangani keduanya dengan baik). Library berikut dipilih karena ringan, murni JavaScript/TypeScript (tanpa dependensi biner tambahan), dan berjalan mulus di lingkungan Next.js (termasuk Server Actions/Route Handler):

- **Excel** — `xlsx` (SheetJS). Digunakan untuk menghasilkan file `.xlsx` dari data laporan (tabel penjualan, pembelian, stok, dsb) langsung di server lalu dikirim sebagai file unduhan.
- **PDF** — `@react-pdf/renderer`. Dipilih karena struk dan laporan dapat disusun menggunakan komponen React biasa (mirip JSX), sehingga tampilannya mudah dikustomisasi dan konsisten dengan desain aplikasi, serta ringan dijalankan di sisi server Next.js.

---

## 2. Struktur Folder Next.js

```text
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── produk/
│   │   ├── tentang/
│   │   ├── layanan/
│   │   ├── lokasi/
│   │   └── kontak/
│   │
│   ├── (auth)/
│   │   └── login/
│   │
│   ├── (owner)/
│   │   ├── dashboard/
│   │   ├── kasir/
│   │   ├── penjualan/
│   │   ├── pembelian/
│   │   ├── produk/
│   │   ├── stok/
│   │   ├── supplier/
│   │   ├── pelanggan/
│   │   ├── keuangan/
│   │   ├── laporan/
│   │   ├── landing-page/
│   │   ├── pengguna/
│   │   └── pengaturan/
│   │
│   ├── (cashier)/
│   │   ├── kasir/
│   │   └── riwayat/
│   │
│   └── api/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── landing/
│   ├── cashier/
│   ├── product/
│   ├── purchase/
│   ├── stock/
│   ├── finance/
│   └── reports/
│
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── permissions.ts
│   ├── currency.ts
│   ├── transaction-number.ts
│   ├── receipt.ts
│   └── stock.ts
│
├── server/
│   ├── services/
│   ├── repositories/
│   ├── actions/
│   └── validations/
│
├── types/
│
└── prisma/
    ├── schema.prisma
    └── seed.ts
```

---

## 3. Testing & Strategi Deployment

### 33.1 Rencana Unit Test & Integration Test

Pengujian difokuskan pada bagian yang paling berisiko terhadap kesalahan data (stok dan uang), bukan menguji semua hal secara berlebihan.

**Unit test** (fungsi murni, cepat dijalankan):

- Perhitungan HPP FIFO (`lib/stock.ts`).
- Konversi satuan (butir ↔ tray ↔ kg sesuai jenis produk).
- Perhitungan subtotal, diskon, dan grand total.
- Perhitungan selisih kas saat tutup kasir.
- Perhitungan laba kotor dan laba bersih.
- Generator nomor transaksi otomatis (format dan keunikan).

**Integration test** (melibatkan database, memakai database test/testcontainer):

- Alur transaksi penjualan lengkap: stok berkurang, batch teralokasi FIFO, pembayaran tersimpan, laba tersimpan.
- Alur pembelian: stok bertambah, batch baru terbentuk, hutang supplier tercatat benar.
- Alur split payment: total sale_payments harus sama dengan grand_total.
- Alur pembatalan transaksi: stok harus kembali seperti semula.
- Proteksi akses: kasir tidak bisa memanggil aksi khusus owner (harga modal, laba, hutang supplier, dsb).
- Validasi stok tidak boleh negatif dan tidak boleh melebihi sisa hutang saat pembayaran supplier.

**Tools yang disarankan:** Vitest atau Jest untuk unit test, Vitest + Prisma Test Environment (atau database Postgres sementara via Docker) untuk integration test. Testing dilakukan bertahap mengikuti fase pengembangan (Fase 4 Kasir dan Fase 3 Pembelian adalah prioritas tertinggi untuk ditulis testnya lebih dulu karena berkaitan langsung dengan uang dan stok).

### 33.2 Strategi Backup Database Otomatis & Disaster Recovery

- **Backup otomatis harian** (misalnya jam 02.00 dini hari) menggunakan `pg_dump` terjadwal (cron job di VPS, atau fitur backup bawaan penyedia database terkelola bila memakai Vercel Postgres/Supabase/Neon, dsb).
- Backup disimpan minimal 7 hari ke belakang (rolling backup), disimpan di lokasi terpisah dari server utama (object storage seperti S3-compatible storage) agar tetap aman bila server utama bermasalah.
- Menu **Backup Data** pada Pengaturan memungkinkan owner memicu backup manual kapan saja (misalnya sebelum melakukan perubahan besar) dan mengunduh salinan backup terbaru.
- **Rencana pemulihan (disaster recovery):** jika terjadi kegagalan server/database, restore dilakukan dari backup harian terakhir menggunakan `pg_restore`. Data yang hilang paling banyak adalah transaksi dalam satu hari terakhir sejak backup, sehingga disarankan backup lebih sering (contoh setiap 6 jam) jika volume transaksi toko tinggi.
- Untuk aplikasi (kode program), digunakan version control (Git) sehingga kode dapat di-deploy ulang kapan saja tanpa kehilangan riwayat.

### 33.3 Environment Variables & Konfigurasi

Aplikasi menggunakan file environment terpisah untuk tiap tahap:

```text
.env.development   → digunakan saat development lokal
.env.staging        → digunakan di lingkungan staging/uji coba (opsional)
.env.production      → digunakan di server produksi
```

Contoh variabel yang dibutuhkan (nilai aktual dirahasiakan, tidak disimpan di Git):

```text
DATABASE_URL=
SESSION_SECRET=
NEXT_PUBLIC_APP_URL=
STORAGE_BUCKET_URL=
STORAGE_DRIVER=local
STORAGE_ENDPOINT=
STORAGE_REGION=auto
STORAGE_BUCKET_NAME=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
NODE_ENV=
```

Untuk upload gambar, `STORAGE_DRIVER=local` hanya digunakan saat development dan menyimpan hasil optimasi ke `public/uploads/products`. Deployment production wajib menggunakan `STORAGE_DRIVER=s3` dengan endpoint S3-compatible, region, nama bucket, URL publik bucket, access key, dan secret key yang lengkap.

Aturan:

- File `.env*` (kecuali `.env.example`) wajib masuk `.gitignore` dan tidak boleh ter-commit ke repository.
- Environment production menggunakan secret yang berbeda dari development (khususnya `SESSION_SECRET` dan kredensial database).
- Konfigurasi disimpan di secret manager platform deployment (Vercel Environment Variables, atau file `.env` yang dijaga aksesnya di VPS).

---

## 4. Aspek Non-Fungsional

### 34.1 SEO Landing Page

- Setiap halaman publik (`Beranda`, `Produk`, `Tentang Kami`, `Layanan`, `Lokasi`, `Kontak`) memiliki metadata unik menggunakan Next.js Metadata API (`title`, `description`, Open Graph image).
- `sitemap.xml` dan `robots.txt` dibuat otomatis menggunakan fitur bawaan Next.js App Router (`app/sitemap.ts` dan `app/robots.ts`) agar terindeks mesin pencari.
- Menggunakan data terstruktur (JSON-LD schema.org tipe `LocalBusiness`/`Store`) pada landing page agar toko lebih mudah muncul di pencarian lokal (misalnya Google Maps/pencarian "jual telur dekat sini").
- URL landing page menggunakan slug yang bersih dan deskriptif (contoh: `/produk`, `/tentang-kami`).

### 34.2 Accessibility (a11y) Dasar

- Kontras warna teks dan latar memenuhi standar WCAG AA minimum agar tetap terbaca.
- Semua gambar produk dan elemen visual memiliki atribut `alt` yang deskriptif.
- Navigasi dan tombol dapat diakses menggunakan keyboard (fokus terlihat jelas), khususnya penting untuk form transaksi kasir yang sering diisi cepat.
- Elemen form (label, input) menggunakan pasangan `label`–`input` yang benar agar ramah pembaca layar (screen reader).

### 34.3 Optimasi Gambar Produk

Gambar produk harus terlihat bagus namun tetap cepat diakses (tidak membebani loading, khususnya bagi pengguna landing page dengan koneksi seluler):

- Menggunakan komponen `next/image` yang otomatis melakukan resize, kompresi, lazy-loading, dan penyajian format modern (WebP/AVIF) sesuai perangkat pengguna.
- Gambar produk diunggah dalam resolusi wajar (disarankan maksimal ~1600px sisi terpanjang) lalu dikompresi otomatis oleh sistem sebelum disimpan ke object storage — tidak menyimpan file asli berukuran sangat besar apa adanya.
- Ditetapkan ukuran maksimum file unggahan (contoh 5MB per gambar) agar proses upload tetap cepat, dengan validasi tipe file (JPG/PNG/WebP saja).
- Placeholder blur (`next/image` blur placeholder) digunakan agar gambar terasa cepat muncul walau sedang dimuat.

### 34.4 Catatan Landing Page

Konten dan desain final landing page (teks, gambar, tampilan) akan disesuaikan belakangan menggunakan file/template yang akan diberikan terpisah dalam framework Next.js yang sudah disiapkan — struktur menu dan kebutuhan data pada Bagian 5 tetap menjadi acuan.

### 34.5 Responsif di Berbagai Perangkat

Seluruh halaman (landing page maupun dashboard) dibangun mobile-first menggunakan breakpoint standar Tailwind CSS, sehingga dapat digunakan dengan baik di HP, tablet, laptop, maupun komputer desktop:

| Breakpoint | Lebar Layar | Perangkat Umum |
|---|---|---|
| Default (tanpa prefix) | < 640px | HP (potret) |
| `sm:` | ≥ 640px | HP (lanskap), HP besar |
| `md:` | ≥ 768px | Tablet (potret) |
| `lg:` | ≥ 1024px | Tablet (lanskap), laptop kecil |
| `xl:` | ≥ 1280px | Laptop/desktop |
| `2xl:` | ≥ 1536px | Monitor besar |

**Perilaku halaman POS (kasir) di tiap perangkat:**

- **HP (< 768px):** Tampilan satu kolom bertumpuk — daftar produk di atas, keranjang belanja dapat dibuka sebagai panel/drawer yang muncul dari bawah agar layar tetap efisien meski sempit.
- **Tablet (768px–1023px):** Tampilan dua kolom berdampingan — daftar/pencarian produk di kiri, keranjang dan pembayaran di kanan (mendekati pengalaman kasir fisik), karena tablet adalah perangkat yang paling umum dipakai untuk kasir toko kecil.
- **Laptop/Desktop (≥ 1024px):** Tampilan dua atau tiga kolom lebih lega — daftar produk (dengan grid gambar), keranjang, dan ringkasan pembayaran ditampilkan sekaligus tanpa perlu berpindah panel, memaksimalkan layar yang lebih luas.

Elemen interaktif (tombol, input jumlah, pilihan satuan) dibuat cukup besar untuk disentuh (target sentuh minimal ±44px) agar nyaman dipakai di layar sentuh HP/tablet, sekaligus tetap nyaman dipakai dengan mouse/keyboard di desktop.

---


> Dokumen ini adalah bagian dari rangkaian dokumentasi proyek **Telur Jagoan**. Lihat `README.md` untuk peta seluruh dokumen.
