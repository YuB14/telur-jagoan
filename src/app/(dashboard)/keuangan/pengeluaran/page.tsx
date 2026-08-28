import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Pencil, Plus } from "lucide-react";

import { FinanceDeleteButton } from "@/components/finance/finance-delete-button";
import { deleteExpenseAction } from "@/server/actions/finance";
import { listExpenses } from "@/server/services/finance";

export const metadata: Metadata = { title: "Pengeluaran | Telur Jagoan" };

const currencyFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

type ExpensePageProps = { searchParams: Promise<{ success?: string; error?: string }> };

const successMessages: Record<string, string> = {
  created: "Pengeluaran berhasil ditambahkan.",
  deleted: "Pengeluaran berhasil dihapus.",
};

export default async function ExpensePage({ searchParams }: ExpensePageProps) {
  const [expenses, params] = await Promise.all([listExpenses(), searchParams]);

  return (
    <div className="mx-auto max-w-[1200px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Keuangan</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pengeluaran</h1>
          <p className="mt-2 text-sm text-muted-foreground">CRUD penuh pengeluaran, kategori, metode pembayaran, dan bukti.</p>
        </div>
        <Link className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90" href="/keuangan/pengeluaran/baru">
          <Plus size={16} aria-hidden="true" /> Tambah Pengeluaran
        </Link>
      </header>

      {params.success && successMessages[params.success] && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessages[params.success]}</p>}
      {params.error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p>}

      <section className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-5 py-3">Nomor</th><th className="px-5 py-3">Tanggal</th><th className="px-5 py-3">Kategori</th><th className="px-5 py-3">Metode</th><th className="px-5 py-3 text-right">Nominal</th><th className="px-5 py-3 text-right">Aksi</th></tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-t hover:bg-muted/30">
                <td className="px-5 py-4 font-semibold">{expense.expenseNumber}</td>
                <td className="px-5 py-4">{dateFormatter.format(expense.expenseDate)}</td>
                <td className="px-5 py-4">{expense.category.name}</td>
                <td className="px-5 py-4">{expense.paymentMethod.name}</td>
                <td className="px-5 py-4 text-right font-semibold text-rose-700">{currencyFormatter.format(Number(expense.amount))}</td>
                <td className="px-5 py-4"><div className="flex justify-end gap-2"><Link className="grid size-8 place-items-center rounded-md text-primary hover:bg-primary/10" href={`/keuangan/pengeluaran/${expense.id}`}><Eye size={16} /></Link><Link className="grid size-8 place-items-center rounded-md text-amber-700 hover:bg-amber-50" href={`/keuangan/pengeluaran/${expense.id}/edit`}><Pencil size={16} /></Link><FinanceDeleteButton action={deleteExpenseAction.bind(null, expense.id)} label={`Hapus ${expense.expenseNumber}`} /></div></td>
              </tr>
            ))}
            {!expenses.length && <tr><td className="px-5 py-16 text-center text-muted-foreground" colSpan={6}>Belum ada pengeluaran.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
