# ROADMAP — Telur Jagoan

Peta jalan pengembangan sistem Telur Jagoan, disusun berdasarkan urutan ketergantungan (fase awal menjadi fondasi fase berikutnya). Estimasi durasi bersifat perkiraan untuk satu developer bekerja penuh waktu — sesuaikan dengan kapasitas dan waktu yang tersedia.

Detail tugas per fase ada di `docs/TASKS.md`.

## Rebaselining Revisi Produk (2026-08-07)

Urutan implementasi tetap mengikuti fase, tetapi navigasi harus disesuaikan lebih dulu: satu menu Penjualan, satu menu Pembelian/Kulakan, Produk dan Kategori terpisah, tanpa menu Supplier/Pelanggan, tiga area Keuangan, Laporan dengan detail/cetak, serta Pengaturan terbatas pada pengguna/struk/backup. Landing page sengaja menjadi pekerjaan paling akhir karena desain belum final. Setiap pembatalan atau retur harus menjaga stok dan keuangan tetap konsisten melalui transaksi database.

## Ringkasan Fase

| Fase | Fokus | Output Utama | Estimasi | Status |
|---|---|---|---|---|
| 1 | Fondasi | Setup project, login, role, proteksi route | 1 minggu | ✅ Selesai |
| 2 | Master Data | Produk, kategori, satuan, supplier, pelanggan | 1 minggu | ✅ Selesai |
| 3 | Pembelian & Stok | Pembelian, batch stok, hutang supplier | 1.5 minggu | 🟨 Sedang berjalan |
| 4 | Kasir (POS) | Transaksi, split payment, FIFO, cetak struk | 2 minggu | 🟨 Sedang berjalan |
| 5 | Keuangan | Pengeluaran, pemasukan, laba kotor/bersih | 1 minggu | ⬜ Belum mulai |
| 6 | Persediaan Lanjutan | Stok opname, kerusakan, peringatan stok | 1 minggu | ⬜ Belum mulai |
| 7 | Laporan | Seluruh laporan + ekspor PDF/Excel | 1 minggu | ✅ Selesai |
| 8 | Landing Page | Halaman publik + SEO | 1 minggu | ⬜ Belum mulai |
| 9 | Testing & Deployment | Unit/integration test, backup, rilis produksi | 1 minggu | ⬜ Belum mulai |
| 10 | Mode Offline/PWA *(opsional)* | Service worker, sinkronisasi offline | 1 minggu | ⬜ Belum mulai / Opsional |

**Total estimasi (tanpa Fase 10): ± 10.5 minggu.**

Status yang disarankan: `⬜ Belum mulai` → `🟨 Berjalan` → `✅ Selesai`. Perbarui kolom status secara berkala (disarankan setiap akhir fase) dan catat di `PROGRESS.md`.

## Ketergantungan Antar Fase

```text
Fase 1 (Fondasi)
   └─▶ Fase 2 (Master Data)
          └─▶ Fase 3 (Pembelian & Stok)
                 └─▶ Fase 4 (Kasir)
                        └─▶ Fase 5 (Keuangan)
                        └─▶ Fase 6 (Persediaan Lanjutan)
                               └─▶ Fase 7 (Laporan)
   └─▶ Fase 8 (Landing Page)  ← dapat dikerjakan paralel setelah Fase 1

Fase 7 & 8 selesai ─▶ Fase 9 (Testing & Deployment) ─▶ Fase 10 (Opsional)
```

Catatan: Fase 8 (Landing Page) tidak bergantung pada modul kasir/pembelian, sehingga bisa dikerjakan **paralel** dengan Fase 3–6 apabila ada lebih dari satu developer, atau diselingi saat menunggu review/testing modul lain.

## Milestone Utama

| Milestone | Tercapai Setelah | Artinya |
|---|---|---|
| M1 — Fondasi Siap | Fase 1 selesai | Bisa login sebagai Owner/Kasir, struktur dashboard siap |
| M2 — Data Siap | Fase 2 selesai | Produk & mitra bisnis (supplier/pelanggan) sudah bisa diinput |
| M3 — Stok Berjalan | Fase 3 selesai | Pembelian tercatat, stok bertambah otomatis |
| M4 — Kasir Aktif (MVP inti) | Fase 4 selesai | Toko sudah bisa transaksi jual-beli harian secara digital |
| M5 — Keuangan Terpantau | Fase 5 selesai | Laba/rugi harian dapat dilihat |
| M6 — Operasional Lengkap | Fase 6–7 selesai | Stok opname, retur, dan laporan lengkap tersedia |
| M7 — Tampil ke Publik | Fase 8 selesai | Landing page toko live |
| M8 — Siap Produksi | Fase 9 selesai | Sistem teruji, ter-backup, dan live di server produksi |
| M9 — Mode Lanjutan *(opsional)* | Fase 10 selesai | Kasir bisa tetap transaksi walau koneksi terputus sementara |

Untuk pencatatan tanggal target/tercapai per milestone secara konkret, gunakan file `MILESTONES.md` (lihat README).

---

> Dokumen ini adalah bagian dari rangkaian dokumentasi proyek **Telur Jagoan**. Lihat `README.md` untuk peta seluruh dokumen.
