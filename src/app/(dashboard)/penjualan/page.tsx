import type { Metadata } from "next";

import { SalesTable } from "@/components/sales/sales-table";
import { listSales } from "@/server/services/sales";

export const metadata: Metadata = { title: "Daftar Penjualan | Telur Jagoan" };

type SalesPageProps = {
  searchParams: Promise<{ success?: string; number?: string; return?: string; error?: string }>;
};

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const [{ sales, role }, params] = await Promise.all([listSales(), searchParams]);

  return (
    <div className="mx-auto max-w-[1500px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Penjualan</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Daftar Penjualan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Detail, cetak ulang struk, pembatalan, dan retur dilakukan dari aksi pada setiap baris.
        </p>
      </header>

      {params.success === "cancelled" && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Penjualan {params.number} berhasil dibatalkan dan stok/kas sudah dibalik.
        </p>
      )}
      {params.success === "returned" && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Retur {params.return} untuk penjualan {params.number} berhasil disimpan.
        </p>
      )}
      {params.error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {params.error}
        </p>
      )}

      <SalesTable sales={sales} role={role} emptyMessage="Belum ada data penjualan." />
    </div>
  );
}
