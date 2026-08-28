import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OpenCashSessionForm } from "@/components/cashier/open-cash-session-form";
import { auth } from "@/lib/auth";
import { isAppRole } from "@/lib/permissions";
import { getCashSessionOpeningData } from "@/server/services/cash-sessions";

export const metadata: Metadata = { title: "Buka Kasir | Telur Jagoan" };

type OpenCashSessionPageProps = {
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

export default async function OpenCashSessionPage({ searchParams }: OpenCashSessionPageProps) {
  const session = await auth();
  if (!isAppRole(session?.user?.role)) redirect("/login");

  const [{ registers, activeSession }, params] = await Promise.all([
    getCashSessionOpeningData(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Operasional Kasir</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Buka Sesi Kasir</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Setiap Kasir hanya dapat memiliki satu sesi aktif.
        </p>
      </header>

      {params.success === "opened" && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Sesi {params.number ?? "kasir"} berhasil dibuka.
        </p>
      )}

      {activeSession ? (
        <section className="rounded-xl border bg-card p-5 sm:p-6">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            OPEN
          </span>
          <h2 className="mt-4 text-xl font-bold">{activeSession.sessionNumber}</h2>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Perangkat</dt><dd className="mt-1 font-medium">{activeSession.cashRegister.code} — {activeSession.cashRegister.name}</dd></div>
            <div><dt className="text-muted-foreground">Dibuka</dt><dd className="mt-1 font-medium">{dateTime.format(activeSession.openedAt)}</dd></div>
            <div><dt className="text-muted-foreground">Modal awal</dt><dd className="mt-1 font-medium">{currency.format(Number(activeSession.openingCash))}</dd></div>
            <div><dt className="text-muted-foreground">Lokasi</dt><dd className="mt-1 font-medium">{activeSession.cashRegister.location ?? "—"}</dd></div>
          </dl>
          {activeSession.notes && <p className="mt-5 rounded-lg bg-muted/50 p-3 text-sm">{activeSession.notes}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/kasir/transaksi-baru" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Transaksi baru</Link>
            <Link href="/kasir/tutup" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">Tutup kasir</Link>
          </div>
        </section>
      ) : registers.length ? (
        <OpenCashSessionForm registers={registers} />
      ) : (
        <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Belum ada perangkat kasir aktif. Hubungi Owner.
        </p>
      )}
    </div>
  );
}
