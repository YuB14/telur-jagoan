import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

import { FinanceDeleteButton } from "@/components/finance/finance-delete-button";
import { deleteExpenseAction, deleteIncomeAction } from "@/server/actions/finance";
import { listFinanceTransactions } from "@/server/services/finance";

export const metadata: Metadata = { title: "Semua Transaksi Keuangan | Telur Jagoan" };

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function FinancePage() {
  const transactions = await listFinanceTransactions();

  return (
    <div className="mx-auto max-w-[1300px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Keuangan</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Semua Transaksi Keuangan</h1>
        <p className="mt-2 text-sm text-muted-foreground">Gabungan pemasukan dan pengeluaran, diurutkan dari transaksi terbaru.</p>
      </header>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Nomor</th>
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-5 py-3 font-medium">Jenis</th>
                <th className="px-5 py-3 font-medium">Kategori/Tipe</th>
                <th className="px-5 py-3 font-medium">Metode</th>
                <th className="px-5 py-3 text-right font-medium">Nominal</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const basePath = transaction.type === "EXPENSE" ? "/keuangan/pengeluaran" : "/keuangan/pemasukan";
                const deleteAction = transaction.type === "EXPENSE"
                  ? deleteExpenseAction.bind(null, transaction.id)
                  : deleteIncomeAction.bind(null, transaction.id);

                return (
                  <tr key={`${transaction.type}:${transaction.id}`} className="border-t align-top hover:bg-muted/30">
                    <td className="px-5 py-4 font-semibold">{transaction.number}</td>
                    <td className="px-5 py-4">{dateFormatter.format(transaction.date)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${transaction.type === "INCOME" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {transaction.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                      </span>
                    </td>
                    <td className="px-5 py-4">{transaction.label}</td>
                    <td className="px-5 py-4">{transaction.paymentMethod.name}</td>
                    <td className={`px-5 py-4 text-right font-semibold ${transaction.type === "INCOME" ? "text-emerald-700" : "text-rose-700"}`}>
                      {transaction.type === "INCOME" ? "+" : "-"} {currencyFormatter.format(Number(transaction.amount))}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link aria-label={`Lihat ${transaction.number}`} className="grid size-8 place-items-center rounded-md text-primary hover:bg-primary/10" href={`${basePath}/${transaction.id}`} title="Lihat detail">
                          <Eye size={16} aria-hidden="true" />
                        </Link>
                        <Link aria-label={`Edit ${transaction.number}`} className="grid size-8 place-items-center rounded-md text-amber-700 hover:bg-amber-50" href={`${basePath}/${transaction.id}/edit`} title="Edit">
                          <Pencil size={16} aria-hidden="true" />
                        </Link>
                        <FinanceDeleteButton action={deleteAction} label={`Hapus ${transaction.number}`} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!transactions.length && (
                <tr>
                  <td className="px-5 py-16 text-center text-muted-foreground" colSpan={7}>Belum ada transaksi keuangan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
