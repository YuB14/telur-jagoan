import type { Metadata } from "next";

import { SalesTable } from "@/components/sales/sales-table";
import { listSales } from "@/server/services/sales";

export const metadata: Metadata = { title: "Transaksi Hari Ini | Telur Jagoan" };

export default async function TodayCashierTransactionsPage() {
  const { sales, role } = await listSales({ todayOnly: true });

  return (
    <div className="mx-auto max-w-[1500px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Kasir</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transaksi Hari Ini</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Daftar transaksi Anda pada tanggal operasional hari ini.
        </p>
      </header>
      <SalesTable sales={sales} role={role} emptyMessage="Belum ada transaksi hari ini." />
    </div>
  );
}
