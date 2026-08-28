# PRD — Telur Jagoan (Product Requirements Document)

Product Requirements Document (PRD) untuk sistem **Telur Jagoan** — aplikasi web manajemen toko telur kecil berbasis Next.js, mencakup landing page, kasir (POS), manajemen supplier/pembelian, dan keuangan.

Dokumen ini menjelaskan **apa** yang harus dibangun (kebutuhan produk, peran pengguna, struktur menu, dan aturan bisnis utama). Untuk detail **bagaimana** alur proses berjalan secara teknis, lihat `docs/BUSINESS_FLOWS.md`. Untuk skema database, lihat `docs/DATABASE_SCHEMA.md`.

---

## Revisi Produk (2026-08-10)

Revisi final menyederhanakan dashboard internal menjadi menu Dashboard, Kasir, Penjualan satu halaman dengan aksi detail/cetak ulang/pembatalan/retur per baris, Pembelian satu halaman dengan tambah/detail/retur/filter supplier, Produk, Kategori Produk, Keuangan tiga sub-menu, Laporan read-only, Pengguna, dan Pengaturan; menu Supplier dan Pelanggan dihapus dari navigasi, sementara tabel `suppliers` dan record internal `Pelanggan Umum` tetap dipakai di balik layar. Landing Page tetap dicatat sebagai pekerjaan terakhir/ditunda sampai desain publik final.

Pembatalan dan retur wajib mengembalikan stok serta memperbarui keuangan secara atomik. Harga/kg ditetapkan statis saat produk dibuat; stok naik otomatis dari pembelian. Pembelian mendukung pembayaran CASH/QRIS/TRANSFER, diskon, ongkir, biaya lain, bukti pembayaran, dan pengingat jatuh tempo H-7/H-3/H-1/H.

## 1. Gambaran Umum

**Telur Jagoan** adalah website responsif berbasis **Next.js** untuk membantu operasional toko kecil yang menjual telur.

Sistem terdiri dari dua bagian utama:

1. **Landing page publik** untuk memperkenalkan toko, produk, layanan, alamat, dan kontak.
2. **Dashboard internal** untuk mengelola penjualan, pembelian, produk/kategori, stok operasional, supplier internal melalui pembelian, Pelanggan Umum internal, keuangan, hutang supplier, dan laporan.

Sistem hanya memiliki dua jenis pengguna:

- `OWNER`
- `CASHIER`

Owner sekaligus berperan sebagai admin. Sistem **tidak menyediakan piutang atau hutang pelanggan**. Setiap penjualan kepada pelanggan harus dibayar lunas saat transaksi. Hutang hanya berlaku pada pembelian toko kepada supplier atau pemasok.

---

## 2. Tujuan Sistem

Sistem Telur Jagoan dibuat untuk:

- Mempermudah transaksi penjualan.
- Membantu kasir melakukan transaksi dengan cepat.
- Mencetak struk penjualan.
- Mencatat pembelian telur dari supplier.
- Mengelola hutang toko kepada supplier.
- Mengontrol stok telur.
- Mencatat telur rusak, pecah, atau kedaluwarsa.
- Mengelola pemasukan dan pengeluaran.
- Menghitung laba kotor dan laba bersih.
- Menyediakan laporan penjualan, pembelian, stok, dan keuangan.
- Memperkenalkan toko melalui landing page.
- Menyimpan riwayat aktivitas transaksi secara terstruktur.

---

## 3. Jenis Pengguna dan Hak Akses

### 4.1 Owner/Admin

Owner memiliki akses penuh untuk:

- Melihat dashboard bisnis.
- Mengelola kasir.
- Melakukan dan melihat seluruh transaksi penjualan.
- Mengelola pembelian.
- Mengelola hutang supplier.
- Mengelola produk dan harga.
- Mengelola stok.
- Mengelola pembelian dan hutang supplier.
- Mencatat pemasukan dan pengeluaran.
- Melihat laba dan seluruh laporan.
- Mengatur landing page setelah Task 8 dilanjutkan, serta identitas toko.
- Mengelola akun kasir.
- Membatalkan transaksi.
- Melakukan stok opname.
- Melihat aktivitas pengguna.

### 4.2 Kasir

Kasir hanya memiliki akses untuk operasional penjualan:

- Login.
- Membuka sesi kasir.
- Memasukkan modal awal.
- Melakukan transaksi penjualan.
- Menerima pembayaran.
- Mencetak dan mencetak ulang struk.
- Melihat transaksi sendiri.
- Menutup sesi kasir.
- Memasukkan jumlah uang fisik saat penutupan kasir.

Kasir tidak dapat:

- Melihat harga modal.
- Melihat laba toko.
- Melihat hutang supplier.
- Mengelola pembelian.
- Mengubah stok secara manual.
- Mengelola produk.
- Mengelola pengguna.
- Mengubah pengaturan toko.
- Melihat seluruh laporan keuangan.

### 4.3 Matriks Hak Akses

| Fitur | Owner/Admin | Kasir |
|---|:---:|:---:|
| Dashboard bisnis | Ya | Tidak |
| Dashboard kasir | Ya | Ya |
| Transaksi penjualan | Ya | Ya |
| Cetak struk | Ya | Ya |
| Cetak ulang struk | Ya | Ya |
| Riwayat seluruh penjualan | Ya | Tidak |
| Riwayat transaksi sendiri | Ya | Ya |
| Melihat harga modal | Ya | Tidak |
| Mengelola produk | Ya | Tidak |
| Supplier internal via pembelian | Ya | Tidak |
| Pelanggan Umum internal | Ya | Otomatis |
| Mengelola pembelian | Ya | Tidak |
| Melihat hutang supplier | Ya | Tidak |
| Mengelola pengeluaran | Ya | Tidak |
| Melihat laba | Ya | Tidak |
| Melakukan stok opname | Ya | Tidak |
| Mengelola kasir | Ya | Tidak |
| Mengatur landing page (ditunda sampai Task 8) | Ya | Tidak |
| Pengaturan toko | Ya | Tidak |

---

## 4. Susunan Menu Landing Page

```text
Beranda
Produk
Tentang Kami
Keunggulan
Layanan
Lokasi
Kontak
Login
```

### Beranda

Menampilkan nama toko, slogan, gambar produk, tombol WhatsApp, produk unggulan, keunggulan, dan informasi layanan.

Contoh slogan:

```text
Telur Segar, Harga Bersahabat
```

### Produk

Menampilkan nama produk, jenis telur, foto, satuan penjualan, harga, status stok, dan tombol pesan.

### Tentang Kami

Menampilkan profil toko, cerita singkat Telur Jagoan, visi pelayanan, dan kualitas produk.

### Keunggulan

- Telur segar.
- Supplier terpercaya.
- Harga terjangkau.
- Melayani eceran dan grosir.
- Stok selalu diperbarui.
- Pelayanan cepat.

### Layanan

- Pembelian eceran.
- Pembelian grosir.
- Pesanan melalui WhatsApp.
- Pengantaran jika tersedia.
- Pemesanan untuk warung, rumah makan, dan usaha.

### Lokasi dan Kontak

Menampilkan alamat, jam operasional, Google Maps, WhatsApp, telepon, media sosial, dan email jika tersedia.

---

## 5. Susunan Menu Owner/Admin

```text
Dashboard

Kasir
├── Transaksi Baru
├── Sesi Kasir
└── Riwayat Sesi Kasir

Penjualan
└── Daftar Penjualan
    └── Aksi per baris: detail, cetak ulang struk, pembatalan Owner, retur Owner

Pembelian
└── Daftar Pembelian
    ├── Tombol Tambah Pembelian
    ├── Aksi per baris: detail, retur, pembayaran hutang
    └── Filter nama supplier dari riwayat pembelian

Produk
└── Data Produk
    ├── Aksi detail produk (termasuk batch dan pergerakan stok)
    ├── Aksi edit produk (tidak mengubah stok langsung)
    ├── Aksi catat kerusakan (FIFO dari batch aktif)
    └── Aksi nonaktifkan produk (ikon sampah; soft delete)

Kategori Produk
└── Data Kategori Produk

Keuangan
├── Semua Transaksi Keuangan
├── Pemasukan
└── Pengeluaran

Laporan
├── Laporan Penjualan
├── Laporan Pembelian
├── Laporan Stok
├── Laporan Produk Terlaris
├── Laporan Hutang Supplier
├── Laporan Pemasukan
├── Laporan Pengeluaran
├── Laporan Laba
└── Laporan Kasir

Semua halaman laporan bersifat read-only. Fitur yang tersedia hanya filter periode/tanggal, tampilan tabel/detail data, serta tombol cetak/ekspor PDF dan Excel. Tidak ada aksi tambah, edit, hapus, pembatalan, atau retur dari halaman Laporan; perubahan data dilakukan dari menu operasional asalnya.

Pengguna
└── Data Kasir
    ├── Tambah kasir
    ├── Edit kasir
    └── Nonaktifkan kasir

Pengaturan
├── Pengaturan Struk
└── Backup Data

Catatan: Landing Page adalah pekerjaan terakhir/ditunda; tidak menjadi menu operasional internal sampai desain dan konten publik final.
```

---

## 6. Susunan Menu Kasir

```text
Dashboard Kasir

Kasir
├── Buka Kasir
├── Transaksi Baru
├── Transaksi Hari Ini
├── Cetak Ulang Struk
└── Tutup Kasir

Riwayat Saya
└── Riwayat Transaksi
```

Dashboard kasir menampilkan nama kasir, status sesi, modal awal, total transaksi hari ini, total penjualan, pembayaran per metode, transaksi terakhir, dan tombol transaksi baru.

---

## 7. Alur Umum Sistem

```text
Supplier mengirim telur
        ↓
Owner mencatat pembelian
        ↓
Stok bertambah
        ↓
Jika belum lunas, tercatat sebagai hutang supplier
        ↓
Kasir menjual produk kepada pelanggan
        ↓
Pelanggan membayar lunas
        ↓
Stok berkurang
        ↓
Penjualan dan pembayaran tercatat
        ↓
Struk dicetak
        ↓
Sistem menghitung harga pokok dan laba
        ↓
Owner melihat laporan
```

---

## 8. Aturan Bisnis Utama

1. Sistem hanya memiliki role `OWNER` dan `CASHIER`.
2. Owner sekaligus berperan sebagai admin.
3. Pelanggan tidak dapat berhutang.
4. Penjualan harus dibayar lunas.
5. Hutang hanya berasal dari pembelian ke supplier.
6. Kasir tidak dapat melihat harga modal dan laba.
7. Semua perubahan stok harus memiliki stock movement.
8. Penjualan harus mengurangi stok.
9. Pembatalan penjualan harus mengembalikan stok.
10. Pembelian yang diterima harus menambah stok.
11. Retur pembelian harus mengurangi stok.
12. Telur rusak harus mengurangi stok.
13. Harga pokok disimpan saat transaksi terjadi.
14. Harga lama pada transaksi tidak berubah ketika harga produk diperbarui.
15. Penjualan, pembayaran, alokasi batch, dan pengurangan stok disimpan dalam satu database transaction.
16. Pembayaran hutang supplier tidak boleh melebihi sisa hutang.
17. Satu kasir hanya boleh memiliki satu sesi aktif.
18. Kasir tidak dapat bertransaksi tanpa sesi aktif.
19. Penghapusan transaksi keuangan diganti dengan pembatalan atau reversal.
20. Transaksi selesai harus memiliki jejak audit.
21. Semua nilai uang menggunakan tipe `DECIMAL`, bukan `FLOAT`.
22. Stok tidak boleh negatif.
23. Owner menerima peringatan jika stok di bawah minimum.

---

## 9. Dashboard Owner

Dashboard owner menampilkan:

- Penjualan hari ini.
- Jumlah transaksi.
- Laba kotor.
- Pengeluaran.
- Estimasi laba bersih.
- Pembelian hari ini.
- Total hutang supplier.
- Hutang jatuh tempo.
- Produk hampir habis.
- Produk habis.
- Batch mendekati kedaluwarsa.
- Telur rusak.
- Sesi kasir aktif.
- Selisih kas.
- Grafik penjualan.
- Grafik laba.
- Produk terlaris.
- Metode pembayaran paling sering digunakan.

### 28.1 Notifikasi di Headbar

Sistem menyediakan ikon lonceng notifikasi pada headbar dashboard (tampil untuk Owner; Kasir hanya menerima notifikasi yang relevan dengannya, misalnya sesi kasirnya sendiri):

```text
Ikon lonceng di headbar menampilkan badge jumlah notifikasi belum dibaca
        ↓
Owner/Kasir mengklik ikon lonceng
        ↓
Dropdown/panel notifikasi terbuka menampilkan daftar notifikasi terbaru (terurut dari yang terbaru)
        ↓
Mengklik salah satu notifikasi mengarahkan ke halaman terkait (contoh: notifikasi stok habis → halaman Produk)
        ↓
Notifikasi ditandai sudah dibaca setelah diklik, atau tersedia tombol "Tandai semua sudah dibaca"
```

Jenis notifikasi dan pemicunya:

| Jenis Notifikasi | Pemicu |
|---|---|
| Stok hampir habis | `current_stock` produk ≤ `minimum_stock` |
| Stok habis | `current_stock` produk = 0 |
| Batch mendekati kedaluwarsa | Batch dengan `expiry_date` dalam 3 hari ke depan |
| **Hutang supplier jatuh tempo** | Muncul otomatis **1 minggu sebelum** `due_date` pembelian yang belum lunas (`UNPAID`/`PARTIAL`), dan tetap muncul (ditandai mendesak) jika sudah melewati jatuh tempo |
| Selisih kas saat tutup kasir | `cash_difference` pada sesi kasir tidak sama dengan 0 |
| Retur menunggu persetujuan | Ada `sale_returns` berstatus `DRAFT` yang menunggu persetujuan owner |

Notifikasi disimpan di tabel `notifications` berikut agar riwayatnya tetap ada dan status "sudah dibaca" dapat dilacak per pengguna:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Penerima notifikasi (NULL berarti untuk semua Owner) |
| `type` | ENUM | Jenis notifikasi (sesuai tabel di atas) |
| `title` | VARCHAR | Judul singkat |
| `message` | TEXT | Isi pesan |
| `reference_type` | VARCHAR | Jenis data terkait |
| `reference_id` | UUID | ID data terkait |
| `is_read` | BOOLEAN | Status sudah dibaca |
| `created_at` | TIMESTAMP | Waktu dibuat |

Notifikasi jenis stok, batch kedaluwarsa, dan hutang jatuh tempo dihasilkan oleh proses terjadwal (cron job/scheduled task) yang berjalan otomatis setiap hari, memeriksa kondisi di atas dan membuat baris `notifications` baru bila kondisi terpenuhi (menghindari duplikasi notifikasi untuk kondisi yang sama pada hari yang sama).

---

## 10. Dashboard Kasir

Dashboard kasir menampilkan:

- Nama kasir.
- Status sesi.
- Modal awal.
- Penjualan hari ini.
- Jumlah transaksi.
- Pembayaran tunai.
- Pembayaran QRIS.
- Pembayaran transfer.
- Transaksi terakhir.
- Tombol Transaksi Baru.
- Tombol Cetak Ulang Struk.
- Tombol Tutup Kasir.

Kasir tidak melihat harga modal, HPP, laba, hutang supplier, pengeluaran toko, atau nilai persediaan.

---

## 11. Legalitas Ringan

Sistem ini **tidak menyediakan** halaman kebijakan privasi atau syarat & ketentuan formal. Untuk toko kecil seperti Telur Jagoan, hal ini tidak wajib dan dapat ditambahkan belakangan apabila suatu saat dibutuhkan (misalnya jika toko berkembang dan mulai menyimpan data pelanggan dalam skala besar atau bermitra dengan pihak ketiga).

---


> Dokumen ini adalah bagian dari rangkaian dokumentasi proyek **Telur Jagoan**. Lihat `README.md` untuk peta seluruh dokumen.
