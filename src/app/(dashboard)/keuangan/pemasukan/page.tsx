import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Pencil, Plus } from "lucide-react";

import { FinanceDeleteButton } from "@/components/finance/finance-delete-button";
import { deleteIncomeAction } from "@/server/actions/finance";
import { listOtherIncomes } from "@/server/services/finance";

export const metadata: Metadata = { title: "Pemasukan | Telur Jagoan" };

const currencyFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

type IncomePageProps = { searchParams: Promise<{ success?: string; error?: string }> };

const successMessages: Record<string, string> = {
  created: "Pemasukan berhasil ditambahkan.",
  deleted: "Pemasukan berhasil dihapus.",
};

export default async function IncomePage({ searchParams }: IncomePageProps) {
  const [incomes, params] = await Promise.all([listOtherIncomes(), searchParams]);

  return (
    <div className="mx-auto max-w-[1200px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Keuangan</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pemasukan</h1>
          <p className="mt-2 text-sm text-muted-foreground">CRUD penuh pemasukan lain-lain.</p>
        </div>
        <Link className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90" href="/keuangan/pemasukan/baru">
          <Plus size={16} aria-hidden="true" /> Tambah Pemasukan
        </Link>
      </header>

      {params.success && successMessages[params.success] && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessages[params.success]}</p>}
      {params.error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p>}

      <section className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-5 py-3">Nomor</th><th className="px-5 py-3">Tanggal</th><th className="px-5 py-3">Jenis</th><th className="px-5 py-3">Metode</th><th className="px-5 py-3 text-right">Nominal</th><th className="px-5 py-3 text-right">Aksi</th></tr>
          </thead>
          <tbody>
            {incomes.map((income) => (
              <tr key={income.id} className="border-t hover:bg-muted/30">
                <td className="px-5 py-4 font-semibold">{income.incomeNumber}</td>
                <td className="px-5 py-4">{dateFormatter.format(income.incomeDate)}</td>
                <td className="px-5 py-4">{income.incomeType}</td>
                <td className="px-5 py-4">{income.paymentMethod.name}</td>
                <td className="px-5 py-4 text-right font-semibold text-emerald-700">{currencyFormatter.format(Number(income.amount))}</td>
                <td className="px-5 py-4"><div className="flex justify-end gap-2"><Link className="grid size-8 place-items-center rounded-md text-primary hover:bg-primary/10" href={`/keuangan/pemasukan/${income.id}`}><Eye size={16} /></Link><Link className="grid size-8 place-items-center rounded-md text-amber-700 hover:bg-amber-50" href={`/keuangan/pemasukan/${income.id}/edit`}><Pencil size={16} /></Link><FinanceDeleteButton action={deleteIncomeAction.bind(null, income.id)} label={`Hapus ${income.incomeNumber}`} /></div></td>
              </tr>
            ))}
            {!incomes.length && <tr><td className="px-5 py-16 text-center text-muted-foreground" colSpan={6}>Belum ada pemasukan.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
