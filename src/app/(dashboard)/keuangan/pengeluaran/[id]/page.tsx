import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getExpenseDetail } from "@/server/services/finance";
import { financeEntryIdSchema } from "@/server/validations/finance";

export const metadata: Metadata = { title: "Detail Pengeluaran | Telur Jagoan" };

const currencyFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium" });

type ExpenseDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
};

export default async function ExpenseDetailPage({ params, searchParams }: ExpenseDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const parsedId = financeEntryIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const expense = await getExpenseDetail(parsedId.data);
  if (!expense) notFound();

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Pengeluaran</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{expense.expenseNumber}</h1>
        </div>
        <Link className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90" href={`/keuangan/pengeluaran/${expense.id}/edit`}>Edit</Link>
      </header>
      {query.success === "updated" && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Pengeluaran berhasil diperbarui.</p>}
      <section className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
        <div><p className="text-xs text-muted-foreground">Tanggal</p><p className="mt-1 font-semibold">{dateFormatter.format(expense.expenseDate)}</p></div>
        <div><p className="text-xs text-muted-foreground">Nominal</p><p className="mt-1 font-semibold text-rose-700">{currencyFormatter.format(Number(expense.amount))}</p></div>
        <div><p className="text-xs text-muted-foreground">Kategori</p><p className="mt-1 font-semibold">{expense.category.name}</p></div>
        <div><p className="text-xs text-muted-foreground">Metode</p><p className="mt-1 font-semibold">{expense.paymentMethod.name}</p></div>
        <div><p className="text-xs text-muted-foreground">Cash movement</p><p className="mt-1 font-semibold">{expense.cashMovement ? "Tercatat" : "Tidak tercatat"}</p></div>
        <div><p className="text-xs text-muted-foreground">Dibuat oleh</p><p className="mt-1 font-semibold">{expense.creator.name}</p></div>
        {expense.receiptUrl && <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Bukti</p><a className="mt-1 block text-primary hover:underline" href={expense.receiptUrl} target="_blank" rel="noreferrer">{expense.receiptUrl}</a></div>}
        <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Keterangan</p><p className="mt-1 whitespace-pre-wrap">{expense.description}</p></div>
      </section>
    </div>
  );
}
