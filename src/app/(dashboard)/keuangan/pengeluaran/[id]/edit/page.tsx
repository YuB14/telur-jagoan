import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExpenseForm } from "@/components/finance/expense-form";
import { getExpenseDetail, listFinanceOptions } from "@/server/services/finance";
import { financeEntryIdSchema } from "@/server/validations/finance";

export const metadata: Metadata = { title: "Edit Pengeluaran | Telur Jagoan" };

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = financeEntryIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const [expense, { categories, paymentMethods }] = await Promise.all([
    getExpenseDetail(parsedId.data),
    listFinanceOptions(),
  ]);
  if (!expense) notFound();

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Pengeluaran</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit Pengeluaran</h1>
      </header>
      <ExpenseForm categories={categories} expense={expense} paymentMethods={paymentMethods} />
    </div>
  );
}
