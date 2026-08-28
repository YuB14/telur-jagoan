import type { Metadata } from "next";
import Link from "next/link";

import { listSupplierDebts } from "@/server/services/purchases";

export const metadata: Metadata = { title: "Hutang Supplier | Telur Jagoan" };

type SupplierDebtsPageProps = {
  searchParams: Promise<{ success?: string; purchase?: string; payment?: string; status?: string }>;
};

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

function getJakartaDateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function SupplierDebtsPage({ searchParams }: SupplierDebtsPageProps) {
  const [debts, params] = await Promise.all([listSupplierDebts(), searchParams]);
  const today = getJakartaDateKey();

  return (
    <div className="mx-auto max-w-[1300px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Pembelian</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hutang Supplier</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pembelian diterima yang masih memiliki sisa hutang.</p>
      </header>

      {params.success === "paid" && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Pembayaran {params.payment} untuk {params.purchase} berhasil disimpan. Status: {params.status}.
        </p>
      )}

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Pembelian</th>
                <th className="px-5 py-3 font-medium">Supplier</th>
                <th className="px-5 py-3 font-medium">Jatuh tempo</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-right font-medium">Dibayar</th>
                <th className="px-5 py-3 text-right font-medium">Sisa</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {debts.map((debt) => {
                const dueKey = debt.dueDate?.toISOString().slice(0, 10);
                const overdue = Boolean(dueKey && dueKey < today);
                return (
                  <tr key={debt.id} className="border-t hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{debt.purchaseNumber}</p>
                      <p className="text-xs text-muted-foreground">{date.format(debt.purchaseDate)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{debt.supplier.name}</p>
                      <p className="text-xs text-muted-foreground">{debt.supplier.supplierCode}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={overdue ? "font-semibold text-rose-600" : ""}>
                        {debt.dueDate ? date.format(debt.dueDate) : "Belum diatur"}
                      </span>
                      {overdue && <span className="ml-2 rounded-full bg-rose-50 px-2 py-1 text-xs text-rose-700">Lewat tempo</span>}
                    </td>
                    <td className="px-5 py-4 text-right">{currency.format(Number(debt.grandTotal))}</td>
                    <td className="px-5 py-4 text-right">{currency.format(Number(debt.amountPaid))}</td>
                    <td className="px-5 py-4 text-right font-bold text-rose-600">{currency.format(Number(debt.remainingDebt))}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/pembelian/${debt.id}/bayar`} className="font-medium text-primary hover:underline">Bayar</Link>
                    </td>
                  </tr>
                );
              })}
              {!debts.length && (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">Tidak ada hutang Supplier aktif.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
