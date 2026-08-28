# TASKS — Telur Jagoan

Daftar tugas pengembangan, disusun per fase sesuai `docs/ROADMAP.md`. Gunakan checkbox ini sebagai acuan progres — centang setiap tugas yang sudah selesai. Untuk pencatatan progres harian/mingguan yang lebih naratif, gunakan file terpisah `PROGRESS.md` (lihat README).

Format status yang disarankan di setiap tugas bila dilacak lebih detail: `Todo` → `In Progress` → `Review` → `Done`.

---

## Fase 1 — Fondasi

- [x] Setup project Next.js (App Router) + TypeScript + Tailwind CSS
- [x] Setup PostgreSQL + Prisma ORM, buat koneksi awal (`lib/db.ts`)
- [x] Buat file `.env.example`, `.env.development`, `.gitignore` (pastikan `.env*` tidak ter-commit)
- [x] Implementasi login menggunakan NextAuth.js (Credentials Provider) + hashing password (bcrypt/argon2)
- [x] Implementasi rate limiting percobaan login (5x gagal → kunci 15 menit)
- [x] Implementasi session JWT + auto-logout 20 menit idle (sliding session)
- [x] Buat `proxy.ts` untuk proteksi route berdasarkan role (Owner vs Kasir; konvensi Next.js 16 pengganti `middleware.ts`)
- [x] Setup header keamanan dasar (CSP, X-Frame-Options, X-Content-Type-Options)
- [x] Buat layout dashboard (sidebar, headbar, area konten) untuk role Owner dan Kasir
- [x] Seed data awal: 1 akun owner, 1 akun kasir

## Fase 2 — Master Data

- [x] CRUD Produk (nama, kategori, gambar, satuan dasar, stok minimum)
- [x] Upload & optimasi gambar produk (`next/image`, kompresi, validasi ukuran max 5MB)
- [x] CRUD Kategori Produk
- [x] CRUD Satuan Produk (`product_units`) + validasi konversi > 0
- [x] Input harga jual per satuan, termasuk produk berbasis kg (harga per kg statis)
- [x] CRUD Supplier (historis; menu CRUD terpisah kemudian dihapus dari navigasi, tabel tetap internal via upsert pembelian)
- [x] CRUD Pelanggan (historis; menu CRUD terpisah kemudian dihapus dari navigasi, hanya record internal "Pelanggan Umum")
- [x] CRUD Metode Pembayaran (historis; pengaturan CRUD dinonaktifkan, opsi operasional tetap CASH/QRIS/TRANSFER)
- [x] Validasi server (Zod) untuk seluruh form master data (lihat `BUSINESS_FLOWS.md` §10.6)

## Fase 3 — Pembelian dan Stok

- [x] Form transaksi pembelian dari supplier (multi-item)
- [x] Pembuatan batch stok otomatis saat pembelian disimpan (`inventory_batches`)
- [x] Pencatatan status pembayaran pembelian (UNPAID/PARTIAL/PAID)
- [x] Fitur pembayaran hutang supplier (cicilan), validasi tidak melebihi sisa hutang
- [x] Pencatatan pergerakan stok masuk (`stock_movements`)
- [x] Fitur retur pembelian (`purchase_returns`, `purchase_return_items`)
- [x] Notifikasi hutang jatuh tempo (H-7 sebelum `due_date`)

## Fase 4 — Kasir (POS)

- [x] Fitur Buka Sesi Kasir (input modal awal)
- [x] Halaman POS: pencarian/pilih produk, pilih satuan & jumlah
- [x] Keranjang belanja: tambah item, ubah jumlah, void/hapus item sebelum checkout
- [x] Validasi stok tidak boleh melebihi `current_stock` saat menambah ke keranjang
- [x] Implementasi split payment (kombinasi Tunai/QRIS/Transfer), validasi total = grand_total
- [x] Perhitungan HPP FIFO otomatis saat transaksi disimpan (`sale_batch_allocations`)
- [x] Cetak struk thermal 80mm via popup + `window.print()`
- [ ] Dukungan printer USB dan Bluetooth (pengaturan printer default per perangkat)
- [x] Simpan struk digital (dapat dicetak ulang), update `print_count` & `last_printed_at`
- [x] Fitur Tutup Sesi Kasir (hitung kas seharusnya vs kas fisik, catat selisih)
- [x] Fitur pembatalan transaksi (khusus izin Owner + alasan wajib)
- [x] Fitur retur penjualan (`sale_returns`, wajib approval Owner)

## Fase 5 — Keuangan

- [x] CRUD Pengeluaran (kategori, jumlah, metode pembayaran, bukti)
- [x] CRUD Pemasukan Lain-lain
- [ ] Halaman Saldo Kas (ringkasan kas masuk/keluar)
- [ ] Laporan rekonsiliasi kasir (selisih kas per sesi)
- [ ] Perhitungan & tampilan Laba Kotor dan Laba Bersih
  - [x] Dashboard Owner menampilkan grafik penjualan dan laba kotor 7 hari terakhir

## Fase 6 — Persediaan Lanjutan

- [ ] Fitur Stok Opname (input stok fisik, hitung selisih, buat penyesuaian)
- [x] Fitur pencatatan telur rusak/kedaluwarsa (`stock_damages`)
- [ ] Peringatan stok minimum & stok habis (notifikasi otomatis)
- [ ] Peringatan batch mendekati kedaluwarsa (H-3)
- [x] Dropdown notifikasi bisa ditutup dengan klik di luar panel dan item bisa disembunyikan dari dropdown tanpa menghapus arsip `/notifikasi`

## Fase 7 — Laporan

- [x] Laporan Penjualan (per periode, per produk, per kasir)
- [x] Laporan Pembelian
- [x] Laporan Stok (mutasi & posisi stok)
- [x] Laporan Hutang Supplier
- [x] Laporan Pengeluaran
- [x] Laporan Laba (kotor & bersih)
- [x] Laporan Kinerja Kasir
- [x] Laporan Produk Terlaris
- [x] Ekspor laporan ke Excel (`xlsx`/SheetJS)
- [x] Ekspor laporan ke PDF (`@react-pdf/renderer`)

## Fase 8 — Landing Page

- [ ] Halaman Beranda (hero, banner dari `landing_banners`)
- [ ] Halaman Produk (katalog publik)
- [ ] Halaman Profil Toko / Tentang Kami
- [ ] Halaman Kontak & Lokasi (peta)
- [ ] Tombol WhatsApp mengambang
- [ ] Menu Pengaturan → Landing Page (CRUD banner, keunggulan, sosial media)
- [ ] Metadata SEO per halaman (title, description, Open Graph)
- [ ] `sitemap.xml` dan `robots.txt` (Next.js Metadata API)
- [ ] Data terstruktur JSON-LD (`LocalBusiness`)

## Fase 9 — Pengujian, Keamanan Lanjutan, dan Deployment

- [ ] Unit test: perhitungan HPP FIFO
- [ ] Unit test: konversi satuan (butir/tray/kg)
- [ ] Unit test: perhitungan subtotal, diskon, grand total
- [ ] Unit test: perhitungan selisih kas tutup kasir
- [ ] Unit test: generator nomor transaksi otomatis
- [ ] Integration test: alur penjualan lengkap (stok, batch, pembayaran, laba)
- [ ] Integration test: alur pembelian lengkap
- [ ] Integration test: split payment (validasi total)
- [ ] Integration test: pembatalan transaksi (stok kembali)
- [ ] Integration test: otorisasi role (kasir tidak bisa akses aksi owner)
- [ ] Setup backup database otomatis harian + uji proses restore
- [ ] Setup CI sederhana (build & test otomatis sebelum deploy)
- [ ] Deployment ke server produksi (Vercel/VPS) + aktifkan HTTPS
- [ ] Audit environment variables production (secret berbeda dari development)

## Fase 10 — Sinkronisasi Akhir Dokumentasi

- [x] Sinkronkan `docs/PRD.md` §5 dengan struktur menu final revisi.
- [x] Sinkronkan ringkasan `Revisi Produk` di bagian atas `docs/PRD.md`.
- [x] Sinkronkan `docs/DATABASE_SCHEMA.md` untuk kolom revisi final dan status Landing Page ditunda.
- [x] Buat/update `database/schema.sql` untuk kolom baru revisi: `purchases.supplier_name`, `purchase_payments.receipt_url`, `expenses.deleted_at`, dan `other_incomes.deleted_at`.
- [x] Tandai task lama yang tidak relevan sebagai historis/digantikan revisi.
- [x] Catat Task 8 Landing Page sebagai ditunda/dikerjakan terakhir.

---

## Revisi Prioritas (2026-08-10)

- [x] Sinkronkan navigasi Penjualan menjadi satu halaman dengan aksi detail, cetak ulang, pembatalan, dan retur per baris.
- [x] Sinkronkan navigasi Pembelian/Kulakan menjadi satu menu dengan laporan, tombol tambah, detail, retur, supplier input bebas, bukti pembayaran, dan notifikasi hutang jatuh tempo.
- [x] Pisahkan Produk dan Kategori Produk sebagai menu terpisah; sederhanakan form produk ke harga per kg dan kelola unit Kg otomatis.
- [x] Hilangkan menu Supplier dari navigasi; pertahankan tabel `suppliers` internal dan tampilkan riwayat/sisa hutang via filter Pembelian.
- [x] Hilangkan menu Pelanggan dari navigasi; pertahankan record internal Pelanggan Umum.
- [x] Sediakan tiga area Keuangan (semua arus, pemasukan, pengeluaran) dengan CRUD dan pembaruan database.
- [x] Pastikan Laporan read-only dengan view, cetak PDF, dan ekspor Excel; Landing Page ditunda/dikerjakan terakhir.
- [x] Batasi Pengaturan pada pengguna, pengaturan struk, dan backup.
- [x] Sinkronisasi akhir dokumentasi dan artefak SQL schema revisi.

Catatan: checklist historis di bawah tetap mencatat pekerjaan implementasi yang sudah dilakukan. Item revisi di atas menjadi backlog lintas fase dan wajib dipenuhi saat modul terkait disentuh.

## Cakupan MVP (Versi Pertama)

Tugas dari fase di atas yang **wajib** ada di rilis pertama:

- [ ] Login owner & kasir
- [ ] Data produk & satuan
- [ ] Supplier internal via input pembelian
- [ ] Pelanggan umum internal otomatis
- [ ] Pembelian
- [ ] Hutang supplier & pembayarannya
- [ ] Manajemen stok dasar
- [ ] Buka & tutup kasir
- [ ] Transaksi penjualan (lunas, tanpa piutang)
- [ ] Cetak struk
- [ ] Pengeluaran
- [ ] Dashboard sederhana
- [ ] Laporan penjualan, stok, dan laba sederhana
- [ ] Landing page (ditunda/dikerjakan terakhir)

## Backlog (Ditunda Setelah MVP)

- [ ] Retur pembelian & penjualan
- [ ] Multi-cabang
- [ ] Pesanan online
- [ ] Pengantaran/delivery
- [ ] Program loyalitas pelanggan
- [ ] Mode offline / PWA
- [ ] Integrasi pembayaran langsung (payment gateway)
- [ ] Notifikasi WhatsApp otomatis
- [ ] Mode offline / PWA: evaluasi kelayakan, service worker, penyimpanan sementara IndexedDB, dan sinkronisasi otomatis saat koneksi kembali

---

> Dokumen ini adalah bagian dari rangkaian dokumentasi proyek **Telur Jagoan**. Lihat `README.md` untuk peta seluruh dokumen.
