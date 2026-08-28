import {
  Banknote,
  Boxes,
  ClipboardList,
  Egg,
  FileBarChart,
  LayoutDashboard,
  MonitorCog,
  ReceiptText,
  Settings,
  ShoppingCart,
  UserRoundCog,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import type { AppRole } from "@/lib/permissions";

export type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

const ownerNavigation: NavigationGroup[] = [
  {
    title: "Utama",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Kasir",
    items: [
      { title: "Transaksi Baru", href: "/kasir/transaksi-baru", icon: ShoppingCart },
      { title: "Sesi Kasir", href: "/kasir/sesi", icon: MonitorCog },
      { title: "Riwayat Sesi Kasir", href: "/kasir/riwayat-sesi", icon: ClipboardList },
    ],
  },
  {
    title: "Penjualan",
    items: [{ title: "Daftar Penjualan", href: "/penjualan", icon: ReceiptText }],
  },
  {
    title: "Pembelian",
    items: [{ title: "Daftar Pembelian", href: "/pembelian", icon: ClipboardList }],
  },
  {
    title: "Produk",
    items: [{ title: "Data Produk", href: "/produk", icon: Egg }],
  },
  {
    title: "Kategori Produk",
    items: [{ title: "Kategori Produk", href: "/produk/kategori", icon: Boxes }],
  },
  {
    title: "Keuangan",
    items: [
      { title: "Semua Transaksi Keuangan", href: "/keuangan", icon: Banknote },
      { title: "Pemasukan", href: "/keuangan/pemasukan", icon: Banknote },
      { title: "Pengeluaran", href: "/keuangan/pengeluaran", icon: WalletCards },
    ],
  },
  {
    title: "Laporan",
    items: [
      { title: "Laporan Penjualan", href: "/laporan/penjualan", icon: FileBarChart },
      { title: "Laporan Pembelian", href: "/laporan/pembelian", icon: FileBarChart },
      { title: "Laporan Stok", href: "/laporan/stok", icon: FileBarChart },
      { title: "Laporan Produk Terlaris", href: "/laporan/produk-terlaris", icon: FileBarChart },
      { title: "Laporan Hutang Supplier", href: "/laporan/hutang-supplier", icon: FileBarChart },
      { title: "Laporan Pemasukan", href: "/laporan/pemasukan", icon: FileBarChart },
      { title: "Laporan Pengeluaran", href: "/laporan/pengeluaran", icon: FileBarChart },
      { title: "Laporan Laba", href: "/laporan/laba", icon: FileBarChart },
      { title: "Laporan Kasir", href: "/laporan/kasir", icon: FileBarChart },
    ],
  },
  {
    title: "Pengguna",
    items: [{ title: "Data Kasir", href: "/pengguna/kasir", icon: UserRoundCog }],
  },
  {
    title: "Pengaturan",
    items: [
      { title: "Pengaturan Struk", href: "/pengaturan/struk", icon: Settings },
      { title: "Backup Data", href: "/pengaturan/backup", icon: Settings },
    ],
  },
];

const cashierNavigation: NavigationGroup[] = [
  {
    title: "Utama",
    items: [{ title: "Dashboard Kasir", href: "/kasir", icon: LayoutDashboard }],
  },
  {
    title: "Kasir",
    items: [
      { title: "Buka Kasir", href: "/kasir/buka", icon: MonitorCog },
      { title: "Transaksi Baru", href: "/kasir/transaksi-baru", icon: ShoppingCart },
      { title: "Transaksi Hari Ini", href: "/kasir/transaksi-hari-ini", icon: ReceiptText },
      { title: "Cetak Ulang Struk", href: "/kasir/cetak-ulang", icon: ReceiptText },
      { title: "Tutup Kasir", href: "/kasir/tutup", icon: MonitorCog },
    ],
  },
  {
    title: "Riwayat Saya",
    items: [
      { title: "Riwayat Transaksi", href: "/riwayat/transaksi", icon: ClipboardList },
      { title: "Daftar Penjualan", href: "/penjualan", icon: ReceiptText },
    ],
  },
];

export function getNavigation(role: AppRole) {
  return role === "OWNER" ? ownerNavigation : cashierNavigation;
}

export function findNavigationItem(role: AppRole, pathname: string) {
  return getNavigation(role)
    .flatMap((group) => group.items)
    .find((item) => item.href === pathname);
}
