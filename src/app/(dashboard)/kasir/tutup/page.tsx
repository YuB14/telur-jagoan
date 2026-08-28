import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CloseCashSessionForm } from "@/components/cashier/close-cash-session-form";
import { auth } from "@/lib/auth";
import { isAppRole } from "@/lib/permissions";
import { getCashSessionClosingData } from "@/server/services/cash-sessions";

export const metadata: Metadata = { title: "Tutup Kasir | Telur Jagoan" };

type CloseCashSessionPageProps = {
  searchParams: Promise<{ success?: string; number?: string }>;
};

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

export default async function CloseCashSessionPage({ searchParams }: CloseCashSessionPageProps) {
  const session = await auth();
  if (!isAppRole(session?.user?.role)) redirect("/login");

  const [{ activeSession, expectedCash }, params] = await Promise.all([
    getCashSessionClosingData(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Operasional Kasir</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tutup Kasir</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Masukkan jumlah uang fisik untuk mencatat selisih kas sesi.
        </p>
      </header>

      {params.success === "closed" && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Sesi {params.number ?? "kasir"} berhasil ditutup.
        </p>
      )}

      {!activeSession || !expectedCash ? (
        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Tidak ada sesi aktif</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Buka sesi kasir terlebih dahulu sebelum melakukan penutupan.
          </p>
          <Link href="/kasir/buka" className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Buka kasir
          </Link>
        </section>
      ) : (
        <>
          <section className="rounded-xl border bg-card p-5 sm:p-6">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              OPEN
            </span>
            <h2 className="mt-4 text-xl font-bold">{activeSession.sessionNumber}</h2>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Perangkat</dt><dd className="mt-1 font-medium">{activeSession.cashRegister.code} - {activeSession.cashRegister.name}</dd></div>
              <div><dt className="text-muted-foreground">Dibuka</dt><dd className="mt-1 font-medium">{dateTime.format(activeSession.openedAt)}</dd></div>
              <div><dt className="text-muted-foreground">Modal awal</dt><dd className="mt-1 font-medium">{currency.format(Number(activeSession.openingCash))}</dd></div>
              <div><dt className="text-muted-foreground">Penjualan sesi</dt><dd className="mt-1 font-medium">{currency.format(activeSession.sales.reduce((total, sale) => total + Number(sale.grandTotal), 0))}</dd></div>
              <div><dt className="text-muted-foreground">Kas seharusnya</dt><dd className="mt-1 text-lg font-bold text-primary">{currency.format(Number(expectedCash))}</dd></div>
            </dl>
          </section>

          <CloseCashSessionForm expectedCash={expectedCash.toString()} />
        </>
      )}
    </div>
  );
}
