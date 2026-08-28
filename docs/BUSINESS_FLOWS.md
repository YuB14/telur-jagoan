# Alur Bisnis & Operasional — Telur Jagoan

Dokumen ini berisi seluruh **alur proses bisnis dan operasional** sistem Telur Jagoan secara berurutan sesuai perjalanan penggunaan sistem sehari-hari: mulai dari login, keamanan, pembelian ke supplier, transaksi kasir, pengelolaan stok, keuangan, hingga pencetakan struk.

Setiap alur dilengkapi diagram teks langkah demi langkah dan aturan bisnis (business rules) yang wajib dipatuhi saat implementasi.

---

## Revisi Alur Produk (2026-08-07)

Navigasi terbaru memakai satu menu Penjualan dan satu menu Pembelian/Kulakan. Aksi baris penjualan adalah detail, cetak ulang, pembatalan, dan retur. Pembatalan/retur mengembalikan stok dan membalik pencatatan keuangan dalam satu transaksi database. Pembelian menerima supplier yang diketik langsung, nomor transaksi/nota manual atau otomatis, item multi-produk, pembayaran CASH/QRIS/TRANSFER, diskon, ongkir, biaya lain, bukti pembayaran, serta pengingat jatuh tempo H-7/H-3/H-1/H; jika lunas, pengingat harus null. Supplier dan pelanggan bukan menu navigasi; Pelanggan Umum adalah record internal default. Keuangan dipisah menjadi semua arus, pemasukan, dan pengeluaran dengan CRUD. Landing page dikerjakan paling akhir.

## 1. Alur Login

```text
Pengguna membuka halaman login
        ↓
Memasukkan email atau username
        ↓
Memasukkan password
        ↓
Sistem memverifikasi akun
        ↓
Sistem memeriksa role
        ↓
OWNER diarahkan ke Dashboard Owner
CASHIER diarahkan ke Dashboard Kasir
```

Aturan:

- Akun tidak aktif tidak dapat login.
- Password disimpan dalam bentuk hash.
- Halaman owner tidak boleh dapat diakses oleh kasir.
- Aktivitas login dapat dicatat dalam audit log.

### 9.1 Implementasi Teknis

- Autentikasi dibangun menggunakan **NextAuth.js (Auth.js)** dengan **Credentials Provider** (username/email + password, dicocokkan ke `password_hash` di tabel `users`), karena sistem ini tidak memakai login pihak ketiga (Google/Facebook, dsb).
- Strategi sesi menggunakan **JWT** (`session.strategy = "jwt"`), sehingga status login (role, id user) disimpan terenkripsi di dalam token JWT pada cookie `httpOnly`, tanpa perlu tabel session terpisah di database.
- **Middleware proteksi route** (`middleware.ts` di root project) memeriksa token JWT pada setiap request ke path `/dashboard/**`. Jika token tidak ada/kedaluwarsa, pengguna dialihkan ke halaman login. Middleware juga memeriksa `role` pada token untuk memisahkan akses halaman khusus Owner dari halaman Kasir sebelum halaman sempat dirender.
- **Penanganan refresh token (JWT):** NextAuth.js secara otomatis memperbarui (rotate) JWT melalui callback `jwt()` setiap kali token diakses selama masih dalam masa berlaku `maxAge`. Karena tidak ada idle di tengah masa aktif yang perlu "diperpanjang" secara manual, token cukup dibuat ulang (re-issued) dengan waktu kedaluwarsa baru setiap kali ada aktivitas pengguna (lihat auto-logout di Bagian 10.2) — pendekatan ini disebut *sliding session*.

---

## 2. Keamanan & Autentikasi

Selain alur login dasar, sistem menerapkan lapisan keamanan berikut agar aman digunakan oleh toko sehari-hari.

### 10.1 Rate Limiting Login (Anti Brute Force)

```text
Percobaan login gagal dihitung per akun dan per alamat IP
        ↓
5 kali gagal berturut-turut dalam 15 menit
        ↓
Akun dikunci sementara selama 15 menit
        ↓
Pesan ditampilkan tanpa membocorkan akun mana yang salah
        ↓
Percobaan login dicatat di activity_logs
```

Aturan:

- Pesan error login tidak membedakan antara "username salah" dan "password salah" (cukup "Username atau password salah").
- Penguncian akun tidak menghapus data, hanya menahan sementara.
- Owner dapat membuka kunci akun kasir secara manual dari menu Pengguna jika diperlukan.

### 10.2 Session Expiry / Auto-Logout

- Session login menggunakan cookie `httpOnly` dan `secure` (khusus HTTPS), dikelola oleh NextAuth.js.
- **Auto-logout setelah 20 menit tanpa aktivitas** (idle timeout), berlaku untuk owner maupun kasir. Setiap ada aktivitas (klik, navigasi, request ke server), masa berlaku token diperpanjang otomatis (*sliding session*) sehingga pengguna yang aktif tidak akan ter-logout tiba-tiba di tengah pekerjaan.
- Jika 20 menit berlalu tanpa aktivitas sama sekali, token JWT dianggap kedaluwarsa, middleware akan menolak akses ke halaman dashboard, dan pengguna diarahkan kembali ke halaman login.
- Saat sesi kasir (`cash_sessions`) masih `OPEN` namun kasir ter-auto-logout, sesi kasir **tidak** otomatis ditutup — hanya sesi login yang berakhir. Sesi kasir tetap harus ditutup manual melalui alur Tutup Kasir setelah kasir login kembali.

### 10.3 CSRF Protection untuk Server Actions

- Seluruh Server Actions Next.js menggunakan mekanisme proteksi CSRF bawaan Next.js (origin checking) dan token action yang tervalidasi otomatis.
- Permintaan mutasi data (create, update, delete) hanya diterima dari origin domain toko sendiri.
- Endpoint API yang diekspos ke luar (jika ada, misalnya webhook) menggunakan API key terpisah, bukan session cookie.

### 10.4 Validasi Input di Sisi Server

- Validasi Zod di form (client-side) hanya untuk pengalaman pengguna (feedback cepat), **bukan sumber kebenaran**.
- Setiap Server Action dan Route Handler **wajib** memvalidasi ulang input menggunakan skema Zod yang sama di sisi server sebelum data diproses atau disimpan ke database.
- Validasi server mencakup: tipe data, batas nilai (misalnya jumlah tidak boleh negatif), keberadaan relasi (produk/supplier/pelanggan benar-benar ada), dan hak akses role terhadap aksi yang diminta.
- Pemeriksaan otorisasi (role Owner/Kasir) dilakukan di layer `server/services`, bukan hanya disembunyikan di UI, sehingga kasir tidak bisa memanggil aksi owner meski tahu endpoint-nya.

### 10.5 Praktik Tambahan

- Password disimpan menggunakan hashing (bcrypt/argon2), bukan enkripsi dua arah.
- Semua komunikasi menggunakan HTTPS (termasuk saat deployment ke VPS, wajib pasang SSL/TLS).
- Header keamanan dasar diaktifkan (Content Security Policy, X-Frame-Options, X-Content-Type-Options).

### 10.6 Daftar Validasi Penting (Zod)

Beberapa aturan validasi kunci yang wajib diterapkan baik di client (UX) maupun di server (sumber kebenaran — lihat Bagian 10.4):

| Field | Aturan Validasi |
|---|---|
| Jumlah beli di keranjang kasir | Tidak boleh melebihi stok yang tersedia (`current_stock` produk terkait). Jika jumlah yang diminta lebih besar dari stok, sistem menolak menambah item dengan pesan "Stok tidak mencukupi" dan tidak dapat melanjutkan checkout. |
| Jumlah pada pembelian, retur, opname | Harus lebih besar dari 0 (tidak boleh 0 atau negatif). |
| Nomor telepon (`phone`, `whatsapp` pada `users`, `suppliers`, `customers`, `store_settings`) | Format nomor Indonesia: diawali `08` atau `+62`, hanya berisi angka (boleh diawali `+`), panjang 9–15 digit. Contoh valid: `081234567890`, `+6281234567890`. |
| Email | Format email standar (`z.string().email()`). |
| Harga jual, harga beli, harga per kg | Harus lebih besar dari 0. |
| Konversi satuan (`conversion_to_base`) | Harus lebih besar dari 0. |
| Pembayaran hutang supplier | Jumlah bayar tidak boleh melebihi `remaining_debt` yang tersisa. |
| Split payment kasir | Total seluruh metode pembayaran harus sama persis dengan `grand_total` transaksi. |
| Password | Minimum 8 karakter saat dibuat/diganti. |

---

## 3. Alur Pembelian dari Supplier

```text
Owner membuka menu Pembelian Baru
        ↓
Mengetik nama supplier
        ↓
Mengisi nomor nota supplier
        ↓
Memilih produk dan satuan
        ↓
Mengisi jumlah dan harga beli
        ↓
Mengisi tanggal masuk dan kedaluwarsa
        ↓
Sistem menghitung subtotal
        ↓
Owner mengisi diskon dan biaya tambahan
        ↓
Sistem menghitung total pembelian
        ↓
Owner memilih pembayaran tunai, sebagian, atau tempo
        ↓
Pembelian disimpan
        ↓
Batch stok dibuat
        ↓
Stok bertambah
        ↓
Pergerakan stok masuk dibuat
        ↓
Jika belum lunas, tercatat sebagai hutang supplier
```

Status pembayaran pembelian:

```text
UNPAID  = Belum dibayar
PARTIAL = Dibayar sebagian
PAID    = Lunas
```

Contoh:

```text
Total pembelian : Rp5.000.000
Dibayar         : Rp2.000.000
Sisa hutang     : Rp3.000.000
Jatuh tempo     : 20 Agustus 2026
Status          : PARTIAL
```

---

## 4. Alur Pembayaran Hutang Supplier

```text
Owner membuka Daftar Pembelian
        ↓
Memfilter berdasarkan supplier atau memilih transaksi pembelian yang belum lunas
        ↓
Sistem menampilkan total dan sisa hutang
        ↓
Owner memasukkan jumlah pembayaran
        ↓
Memilih metode pembayaran
        ↓
Menyimpan pembayaran
        ↓
Sistem menghitung ulang sisa hutang
        ↓
Jika sisa hutang = 0, status menjadi PAID
```

Aturan:

- Pembayaran tidak boleh melebihi sisa hutang.
- Setiap pembayaran memiliki nomor bukti.
- Riwayat pembayaran tidak boleh dihapus sembarangan.
- Koreksi pembayaran dilakukan melalui reversal atau pembatalan tercatat.
- Hutang melewati jatuh tempo diberi penanda.

---

## 5. Alur Transaksi Kasir

```text
Kasir login
        ↓
Kasir membuka sesi kasir
        ↓
Memasukkan modal awal
        ↓
Kasir membuka Transaksi Baru
        ↓
Memilih atau mencari produk
        ↓
Memilih satuan dan jumlah
        ↓
Sistem memeriksa stok
        ↓
Produk masuk ke keranjang
        ↓
Sistem menghitung subtotal
        ↓
Kasir memasukkan diskon jika diizinkan
        ↓
Pelanggan melakukan pembayaran
        ↓
Kasir memilih metode pembayaran
        ↓
Sistem memvalidasi pembayaran lunas
        ↓
Transaksi disimpan
        ↓
Stok berkurang
        ↓
Harga pokok penjualan disimpan
        ↓
Pembayaran dicatat
        ↓
Struk dicetak
```

Aturan:

- Penjualan tidak boleh disimpan jika stok tidak mencukupi.
- Penjualan harus dibayar lunas.
- Tidak ada piutang pelanggan.
- Kasir tidak memilih pelanggan; sistem otomatis memakai record internal `Pelanggan Umum` (`CUS-0000`) sebagai `customer_id`.
- Kasir tidak dapat melihat harga beli.
- Pembatalan transaksi membutuhkan hak owner atau alasan tercatat.
- **Tidak ada pembulatan harga.** Total transaksi mengikuti nilai persis hasil perhitungan (harga × jumlah − diskon), tanpa dibulatkan ke kelipatan 50/100.

### 13.1 Void / Hapus Item dari Keranjang

Sebelum transaksi disimpan (checkout), kasir dapat mengubah isi keranjang secara bebas:

```text
Kasir menambahkan produk ke keranjang
        ↓
Item tersimpan sementara di state keranjang (belum masuk database)
        ↓
Kasir dapat mengubah jumlah item
        ↓
Kasir dapat menghapus (void) item tertentu dari keranjang
        ↓
Sistem menghitung ulang subtotal secara otomatis
        ↓
Kasir melanjutkan ke pembayaran, atau
Kasir membatalkan seluruh keranjang (kosongkan keranjang)
```

Catatan: karena keranjang belum tersimpan ke tabel `sales`, void item pada tahap ini **tidak** memerlukan izin owner dan tidak tercatat sebagai pembatalan transaksi. Pembatalan transaksi (butuh izin owner) hanya berlaku untuk transaksi yang **sudah** tersimpan/`COMPLETED`.

### 13.2 Split Payment (Pembayaran Gabungan)

Satu transaksi penjualan dapat dibayar menggunakan lebih dari satu metode pembayaran sekaligus, misalnya sebagian tunai dan sebagian QRIS atau transfer.

```text
Kasir memilih Bayar
        ↓
Kasir memilih metode pembayaran pertama (contoh: CASH)
        ↓
Kasir memasukkan jumlah untuk metode tersebut
        ↓
Sistem menghitung sisa tagihan
        ↓
Jika sisa tagihan > 0, kasir dapat menambah metode pembayaran lain (QRIS atau TRANSFER)
        ↓
Diulang sampai sisa tagihan = 0
        ↓
Setiap metode pembayaran disimpan sebagai baris terpisah di sale_payments
        ↓
Sistem memvalidasi total seluruh sale_payments = grand_total penjualan
```

Contoh:

```text
Total belanja  : Rp150.000
Bayar tunai     : Rp100.000
Bayar QRIS      : Rp50.000
Total dibayar   : Rp150.000 (lunas)
```

Metode pembayaran yang didukung untuk penjualan: **Tunai (CASH)**, **QRIS**, dan **Transfer Bank (TRANSFER)**. Struktur tabel `sale_payments` dan enum `PaymentMethodType` pada rancangan ini sudah mendukung skenario ini tanpa perlu perubahan skema.

### 13.3 Mode Koneksi Internet Terputus (Opsional: Offline-First / PWA)

Kasir menggunakan koneksi data seluler sebagai jalur utama. Namun karena koneksi dapat terputus sewaktu-waktu, sistem **boleh** menyediakan mode offline-first berbasis PWA (Progressive Web App) sebagai fitur opsional/lanjutan, bukan kebutuhan wajib di tahap awal:

```text
Koneksi internet terputus saat kasir bertransaksi
        ↓
(Jika mode PWA offline aktif)
Transaksi tetap dapat dibuat dan disimpan sementara di local storage/IndexedDB perangkat kasir
        ↓
Struk tetap bisa dicetak dari data lokal
        ↓
Saat koneksi kembali tersedia, transaksi otomatis disinkronkan ke server
        ↓
Sistem memvalidasi ulang stok saat sinkronisasi (mencegah stok minus akibat transaksi ganda dari perangkat berbeda)
```

Catatan implementasi:

- Fitur ini **opsional** — hanya dikerjakan apabila cukup mudah diimplementasikan dengan effort yang wajar (Service Worker + IndexedDB + Background Sync API).
- Jika tidak dikerjakan di versi awal, sistem cukup menampilkan notifikasi "Koneksi terputus, transaksi tidak dapat diproses" saat offline, dan kasir menunggu koneksi kembali.
- Ditempatkan sebagai fitur lanjutan pada fase pengembangan (lihat Fase 9 — PWA & Mode Offline).

---

## 6. Alur Buka dan Tutup Kasir

### Buka Kasir

```text
Kasir login
        ↓
Memilih Buka Kasir
        ↓
Memasukkan modal awal
        ↓
Sistem membuat sesi kasir
        ↓
Status sesi menjadi OPEN
        ↓
Kasir dapat melakukan transaksi
```

Aturan:

- Satu kasir hanya boleh memiliki satu sesi aktif.
- Kasir tidak dapat bertransaksi sebelum membuka sesi.
- Modal awal bukan pemasukan penjualan.

### Tutup Kasir

```text
Kasir memilih Tutup Kasir
        ↓
Sistem menghitung uang yang seharusnya
        ↓
Kasir menghitung uang fisik
        ↓
Kasir memasukkan jumlah uang fisik
        ↓
Sistem menghitung selisih
        ↓
Kasir memasukkan catatan jika ada selisih
        ↓
Sesi ditutup dan owner dapat memeriksa
```

Rumus:

```text
Kas Seharusnya =
Modal Awal
+ Penjualan Tunai
+ Kas Masuk
- Kas Keluar
- Pengembalian Tunai
```

```text
Selisih Kas = Kas Fisik - Kas Seharusnya
```

---

## 7. Alur Stok

Stok masuk dapat berasal dari:

- Pembelian supplier.
- Retur penjualan.
- Koreksi stok.
- Hasil stok opname.

Stok keluar dapat berasal dari:

- Penjualan.
- Retur pembelian.
- Produk rusak.
- Produk pecah.
- Produk kedaluwarsa.
- Koreksi stok.
- Hasil stok opname.

Semua perubahan stok wajib dicatat di tabel `stock_movements`.

### Telur Rusak atau Kedaluwarsa

```text
Owner memilih produk dan batch
        ↓
Memasukkan jumlah dan alasan
        ↓
Sistem mengurangi stok
        ↓
Pergerakan stok keluar dibuat
        ↓
Nilai kerugian dihitung dari harga modal
        ↓
Masuk laporan kerugian stok
```

### Stok Opname

```text
Owner membuat stok opname
        ↓
Sistem mengambil stok tercatat
        ↓
Owner menghitung stok fisik
        ↓
Sistem menghitung selisih
        ↓
Owner mengonfirmasi hasil
        ↓
Sistem membuat penyesuaian stok
```

---

## 8. Alur Keuangan dan Laba

Pemasukan dapat berasal dari:

- Penjualan.
- Pemasukan lain-lain.
- Penambahan modal owner.
- Pengembalian dana dari supplier.

Pengeluaran dapat berasal dari:

- Pembayaran supplier.
- Listrik.
- Transportasi.
- Plastik atau kemasan.
- Gaji kasir.
- Perawatan.
- Sewa.
- Pengeluaran lain.

Rumus:

```text
Arus Kas = Kas Masuk - Kas Keluar
```

```text
Laba Kotor = Penjualan Bersih - Harga Pokok Penjualan
```

```text
Laba Bersih = Laba Kotor - Pengeluaran Operasional
```

Pembelian stok tidak langsung dianggap sebagai kerugian seluruhnya karena barang yang belum terjual masih menjadi persediaan.

Menu Keuangan terdiri dari tiga halaman:

- Semua Transaksi Keuangan: gabungan `expenses` dan `other_incomes`, dengan aksi lihat, edit, dan hapus.
- Pemasukan: CRUD penuh `other_incomes`.
- Pengeluaran: CRUD penuh `expenses`, termasuk kategori pengeluaran dan bukti.

Edit atau hapus pemasukan/pengeluaran dilakukan dalam satu transaksi database. Jika data memiliki `cash_movement_id`, sistem mengoreksi nominal/keterangan `cash_movements` saat edit atau menghapus `cash_movements` terkait saat soft-delete. Setiap edit/hapus dicatat di `activity_logs`.

Halaman Laporan hanya untuk membaca dan mencetak data. Owner dapat memilih periode, melihat tabel/detail ringkas, lalu mencetak PDF atau mengekspor Excel. Tidak ada aksi ubah data di Laporan; koreksi tetap dilakukan dari Penjualan, Pembelian, Keuangan, atau modul operasional terkait.

## 8.1 Pengguna dan Pengaturan

Menu Pengguna hanya berisi Data Kasir. Owner dapat menambah, mengedit, dan menonaktifkan akun kasir; Owner tidak menghapus akun sendiri dari modul ini.

Menu Pengaturan hanya berisi Pengaturan Struk dan Backup Data. Pengaturan Struk memakai `store_settings` untuk logo toko, nama toko di struk, alamat, nomor telepon/WhatsApp, dan footer struk. Backup Data memungkinkan Owner memicu backup manual dan mengunduh backup terakhir. Profil Toko, Nomor Transaksi, Metode Pembayaran, dan Pengaturan Stok tidak menjadi menu terpisah.

---

## 9. Sistem Satuan Produk

Semua stok disimpan dalam satuan dasar.

Contoh:

```text
Produk       : Telur Ayam Ras
Satuan dasar : BUTIR
```

| Satuan | Konversi |
|---|---:|
| Butir | 1 |
| Tray | 30 |
| Peti | Sesuai isi sebenarnya |

Contoh penjualan:

```text
2 tray × 30 butir = 60 butir
```

Aturan:

- Setiap produk memiliki satu satuan dasar.
- Harga dapat berbeda untuk tiap satuan.
- Konversi harus lebih dari nol.
- Produk berdasarkan berat menggunakan satuan dasar kilogram.
- Jangan memaksakan konversi kilogram ke butir.

### 17.1 Produk Berdasarkan Berat (Kilogram)

Untuk produk yang dijual per kilogram, harga **sudah ditentukan di awal saat data produk ditambahkan/diedit** oleh owner (harga per kg statis, bukan ditimbang real-time saat transaksi). Kasir tinggal memasukkan jumlah kilogram yang dibeli pelanggan secara manual (input angka, misalnya 1.5 kg), lalu sistem mengalikan dengan harga per kg yang sudah tersimpan di `product_units.selling_price`.

```text
Contoh:
Produk        : Telur Ayam Ras
Satuan        : Kg
Harga per kg  : Rp28.000 (ditentukan owner saat input produk)

Kasir memasukkan jumlah : 1.5 kg
Subtotal                : 1.5 × Rp28.000 = Rp42.000
```

Tidak diperlukan integrasi timbangan digital — jumlah kilogram diinput manual oleh kasir berdasarkan hasil timbangan fisik di toko.

---

## 10. Metode Harga Pokok FIFO

FIFO berarti stok yang masuk lebih dahulu digunakan lebih dahulu.

Contoh:

```text
Batch A: 100 butir × Rp1.600
Batch B: 100 butir × Rp1.700
Penjualan: 120 butir
```

HPP:

```text
100 × Rp1.600 = Rp160.000
20 × Rp1.700  = Rp34.000
Total HPP     = Rp194.000
```

---

## 11. Cetak Struk — Detail Teknis

### 19.1 Ukuran Kertas

- Struk dicetak menggunakan format **thermal 80mm** (standar printer kasir thermal).
- Layout struk (`@media print` / komponen cetak) dirancang dengan lebar tetap 80mm agar rapi di semua printer thermal 80mm.

### 19.2 Dukungan Printer

Sistem mendukung dua jalur pencetakan:

- **Printer thermal USB** — tersambung langsung ke perangkat kasir (laptop/PC/tablet), dicetak melalui dialog print browser atau library thermal printing (contoh: menggunakan Web USB API/ESC-POS command untuk cetak langsung tanpa dialog print, jika diperlukan kecepatan lebih tinggi).
- **Printer thermal Bluetooth** — tersambung ke perangkat kasir (khususnya tablet/HP) melalui Web Bluetooth API, mengirim perintah cetak ESC-POS ke printer.

Kasir dapat memilih/menyimpan printer default (USB atau Bluetooth) di pengaturan perangkat kasirnya, sehingga tidak perlu memilih ulang setiap transaksi.

### 19.3 Struk Digital (Elektronik)

Selain cetak fisik, sistem dapat menyimpan salinan struk secara elektronik:

```text
Transaksi selesai
        ↓
Sistem membuat struk (format cetak + format digital)
        ↓
Struk fisik dicetak ke printer thermal (jika tersedia)
        ↓
Struk digital disimpan sebagai catatan transaksi (dapat dilihat ulang, dicetak ulang, atau dibagikan)
```

- Karena seluruh data transaksi (item, harga, pembayaran) sudah tersimpan lengkap di `sales`, `sale_items`, dan `sale_payments`, struk **selalu bisa dibuat ulang kapan saja** dari data tersebut — tidak wajib menyimpan file gambar/PDF terpisah untuk setiap transaksi.
- Struk digital ditampilkan melalui halaman "Cetak Ulang Struk" dan dapat diunduh sebagai gambar/PDF atau dibagikan (misalnya dikirim manual via WhatsApp) jika dibutuhkan.
- Tabel `sales` ditambahkan kolom berikut untuk mendukung fitur ini:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `print_count` | INTEGER | Jumlah struk sudah dicetak/dicetak ulang |
| `last_printed_at` | TIMESTAMP | Waktu terakhir struk dicetak |

### 19.4 Konten Struk

Struk mencantumkan informasi berikut, disusun dari atas ke bawah:

```text
[Logo Toko]
Nama Toko            (dari store_settings.store_name)
Alamat Toko          (store_settings.address)
No. Telepon/WA       (store_settings.phone / whatsapp)
--------------------------------
No. Transaksi        (sales.sale_number)
Tanggal & Jam         (sales.sale_date)
Kasir                (nama kasir yang login)
--------------------------------
Daftar Item:
  Nama Produk
  Jumlah x Satuan @ Harga Satuan       Subtotal
  (diulang untuk setiap item, termasuk diskon per item jika ada)
--------------------------------
Subtotal
Diskon               (jika ada)
Total
Bayar (per metode)   (contoh: Tunai Rp100.000, QRIS Rp50.000)
Kembalian
--------------------------------
Footer               (store_settings.receipt_footer,
                       contoh: "Terima kasih telah berbelanja di Telur Jagoan")
```

Struk **tidak** menyertakan QR code — cukup teks sesuai susunan di atas.

### 19.5 Mekanisme Cetak (Popup Window)

```text
Kasir menekan tombol "Cetak Struk"
        ↓
Sistem membuka jendela popup baru berisi halaman struk (layout 80mm, CSS @media print)
        ↓
window.print() dipanggil otomatis saat popup terbuka
        ↓
Dialog cetak browser muncul, kasir memilih printer thermal (USB/Bluetooth) yang sudah terpasang di sistem operasi perangkat
        ↓
Popup tertutup otomatis setelah proses cetak selesai/dibatalkan
```

Catatan: pendekatan popup + `window.print()` dipilih karena paling sederhana dan kompatibel di berbagai browser tanpa driver tambahan, selama printer thermal sudah terpasang sebagai printer sistem operasi (baik lewat kabel USB maupun pairing Bluetooth). Untuk kebutuhan cetak yang lebih cepat tanpa dialog print (opsional/lanjutan), dapat dikembangkan lebih lanjut memakai perintah ESC-POS langsung seperti disebutkan di Bagian 19.2.

---


> Dokumen ini adalah bagian dari rangkaian dokumentasi proyek **Telur Jagoan**. Lihat `README.md` untuk peta seluruh dokumen.
