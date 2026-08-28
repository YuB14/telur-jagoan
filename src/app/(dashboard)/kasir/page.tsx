import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Banknote, Clock3, CreditCard, ReceiptText, ShoppingCart, WalletCards } from "lucide-react";

import { auth } from "@/lib/auth";
import { isAppRole } from "@/lib/permissions";
import { getCashierDashboardData } from "@/server/services/cash-sessions";

export const metadata: Metadata = { title: "Dashboard Kasir | Telur Jagoan" };

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});
const dateTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function CashierDashboardPage() {
  const session = await auth();
  if (!isAppRole(session?.user?.role)) redirect("/login");

  const data = await getCashierDashboardData();
  const stats = [
    { label: "Status sesi", value: data.activeSession ? "OPEN" : "Belum buka", icon: Clock3 },
    { label: "Modal awal", value: data.activeSession ? currency.format(Number(data.activeSession.openingCash)) : "-", icon: Banknote },
    { label: "Penjualan hari ini", value: currency.format(Number(data.todaySummary.totalSales)), icon: ShoppingCart },
    { label: "Jumlah transaksi", value: String(data.todaySummary.transactionCount), icon: ReceiptText },
    { label: "Tunai", value: currency.format(Number(data.todaySummary.paymentTotals.CASH)), icon: Banknote },
    { label: "QRIS", value: currency.format(Number(data.todaySummary.paymentTotals.QRIS)), icon: CreditCard },
    { label: "Transfer", value: currency.format(Number(data.todaySummary.paymentTotals.TRANSFER)), icon: WalletCards },
  ];

  return (
    <div className="mx-auto max-w-[1500px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Dashboard Kasir</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Selamat datang, {data.cashier.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ringkasan sesi aktif, transaksi hari ini, dan pembayaran per metode.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/kasir/transaksi-baru" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
            Transaksi baru
          </Link>
          <Link href={data.activeSession ? "/kasir/tutup" : "/kasir/buka"} className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
            {data.activeSession ? "Tutup kasir" : "Buka kasir"}
          </Link>
        </div>
      </header>

      <section aria-label="Ringkasan dashboard kasir" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                <Icon size={18} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <article className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Transaksi terakhir sesi ini</h2>
          <div className="mt-4 space-y-3">
            {data.activeSession?.sales.map((sale) => (
              <Link key={sale.id} href={`/penjualan/${sale.id}`} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm hover:bg-muted/40">
                <span>
                  <span className="block font-semibold">{sale.saleNumber}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{dateTime.format(sale.saleDate)}</span>
                </span>
                <strong>{currency.format(Number(sale.grandTotal))}</strong>
              </Link>
            ))}
            {!data.activeSession?.sales.length && (
              <p className="rounded-lg bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
                Belum ada transaksi pada sesi aktif.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Sesi aktif</h2>
          {data.activeSession ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-muted-foreground">Nomor sesi</dt><dd className="mt-1 font-semibold">{data.activeSession.sessionNumber}</dd></div>
              <div><dt className="text-muted-foreground">Perangkat</dt><dd className="mt-1 font-semibold">{data.activeSession.cashRegister.code} - {data.activeSession.cashRegister.name}</dd></div>
              <div><dt className="text-muted-foreground">Dibuka</dt><dd className="mt-1 font-semibold">{dateTime.format(data.activeSession.openedAt)}</dd></div>
              <div><dt className="text-muted-foreground">Kas seharusnya</dt><dd className="mt-1 text-lg font-bold text-primary">{data.expectedCash ? currency.format(Number(data.expectedCash)) : "-"}</dd></div>
            </dl>
          ) : (
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-6 text-sm text-amber-800">
              Sesi kasir belum dibuka. Buka sesi sebelum membuat transaksi.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
