import type { Metadata } from "next";

import { IncomeForm } from "@/components/finance/income-form";
import { listFinanceOptions } from "@/server/services/finance";

export const metadata: Metadata = { title: "Tambah Pemasukan | Telur Jagoan" };

export default async function NewIncomePage() {
  const { paymentMethods } = await listFinanceOptions();

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Keuangan</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tambah Pemasukan</h1>
        <p className="mt-2 text-sm text-muted-foreground">Catat pemasukan lain-lain di luar penjualan kasir.</p>
      </header>
      <IncomeForm paymentMethods={paymentMethods} />
    </div>
  );
}
