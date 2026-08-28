import type { Metadata } from "next";

import { ExpenseForm } from "@/components/finance/expense-form";
import { listFinanceOptions } from "@/server/services/finance";

export const metadata: Metadata = { title: "Tambah Pengeluaran | Telur Jagoan" };

export default async function NewExpensePage() {
  const { categories, paymentMethods } = await listFinanceOptions();

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Keuangan</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tambah Pengeluaran</h1>
        <p className="mt-2 text-sm text-muted-foreground">Catat biaya operasional toko.</p>
      </header>
      <ExpenseForm categories={categories} paymentMethods={paymentMethods} />
    </div>
  );
}
