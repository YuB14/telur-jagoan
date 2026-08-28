import type { Metadata } from "next";

import { SalesTable } from "@/components/sales/sales-table";
import { listSales } from "@/server/services/sales";

export const metadata: Metadata = { title: "Cetak Ulang Struk | Telur Jagoan" };

export default async function ReprintReceiptPage() {
  const { sales, role } = await listSales();

  return (
    <div className="mx-auto max-w-[1500px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Kasir</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cetak Ulang Struk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pilih ikon printer pada transaksi untuk mencetak ulang struk.
        </p>
      </header>
      <SalesTable sales={sales} role={role} emptyMessage="Belum ada struk yang dapat dicetak ulang." />
    </div>
  );
}
