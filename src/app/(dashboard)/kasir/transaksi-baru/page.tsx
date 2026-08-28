import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductSelector } from "@/components/pos/product-selector";
import { auth } from "@/lib/auth";
import { isAppRole } from "@/lib/permissions";
import { getPosPageData } from "@/server/services/pos";

export const metadata: Metadata = { title: "Transaksi Baru | Telur Jagoan" };

export default async function NewSalePage() {
  const session = await auth();
  if (!isAppRole(session?.user?.role)) redirect("/login");

  const { activeSession, products, paymentMethods } = await getPosPageData();

  return (
    <div className="w-full max-w-none animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Kasir (POS)</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transaksi Baru</h1>
          <p className="mt-2 text-sm text-muted-foreground">Cari Produk, lalu pilih Satuan dan jumlah penjualan.</p>
        </div>
        {activeSession && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              ● {activeSession.sessionNumber} ({activeSession.cashRegister.code})
            </span>
            <Link
              href="/kasir/tutup"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:border-primary/40"
            >
              Tutup Sesi Kasir
            </Link>
          </div>
        )}
      </header>

      {!activeSession ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="font-semibold">Sesi Kasir belum dibuka</h2>
          <p className="mt-2 text-sm">Transaksi tidak dapat dimulai sebelum modal awal dan sesi aktif tersedia.</p>
          <Link href="/kasir/buka" className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Buka sesi Kasir</Link>
        </section>
      ) : (
        <ProductSelector products={products} paymentMethods={paymentMethods} />
      )}
    </div>
  );
}
