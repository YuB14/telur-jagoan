import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Plus, RotateCcw } from "lucide-react";

import { listPurchases, listPurchaseSupplierFilters } from "@/server/services/purchases";

export const metadata: Metadata = { title: "Daftar Pembelian | Telur Jagoan" };

type PurchasesPageProps = {
  searchParams: Promise<{
    success?: string;
    number?: string;
    return?: string;
    error?: string;
    supplier?: string;
  }>;
};

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

export default async function PurchasesPage({ searchParams }: PurchasesPageProps) {
  const params = await searchParams;
  const selectedSupplier = params.supplier?.trim() || undefined;
  const [purchases, supplierFilters] = await Promise.all([
    listPurchases({ supplierName: selectedSupplier }),
    listPurchaseSupplierFilters(),
  ]);

  return (
    <div className="mx-auto max-w-[1300px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Pembelian/Kulakan</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Daftar Pembelian</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Satu halaman pembelian dengan aksi detail dan retur per baris.
          </p>
        </div>
        <Link href="/pembelian/baru" className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus size={16} aria-hidden="true" /> Tambah Pembelian
        </Link>
      </header>

      {params.success === "created" && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Pembelian {params.number} berhasil disimpan; stok dan pembayaran sudah diproses.
        </p>
      )}
      {params.success === "returned" && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Retur {params.return} untuk pembelian {params.number} berhasil disimpan.
        </p>
      )}
      {params.error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {params.error}
        </p>
      )}

      <form className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end" method="get">
        <label className="flex-1 space-y-2 text-sm font-medium">
          Filter supplier
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            defaultValue={selectedSupplier ?? ""}
            name="supplier"
          >
            <option value="">Semua supplier</option>
            {supplierFilters.map((supplierName) => (
              <option key={supplierName} value={supplierName}>
                {supplierName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90" type="submit">
            Terapkan
          </button>
          {selectedSupplier && (
            <Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted" href="/pembelian">
              Reset
            </Link>
          )}
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Nomor pembelian</th>
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-5 py-3 font-medium">Nama supplier</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status pembayaran</th>
                <th className="px-5 py-3 text-right font-medium">Sisa hutang</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="border-t align-top hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{purchase.purchaseNumber}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{purchase._count.items} item</p>
                  </td>
                  <td className="px-5 py-4">{dateFormatter.format(purchase.purchaseDate)}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium">{purchase.supplierName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{purchase.supplier.supplierCode}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {currencyFormatter.format(Number(purchase.grandTotal))}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${purchase.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {purchase.paymentStatus === "PAID" ? "Lunas" : "Hutang"}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Dibayar {currencyFormatter.format(Number(purchase.amountPaid))}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {currencyFormatter.format(Number(purchase.remainingDebt))}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link href={`/pembelian/${purchase.id}`} title="Lihat detail pembelian" aria-label={`Lihat detail ${purchase.purchaseNumber}`} className="grid size-8 place-items-center rounded-md text-primary hover:bg-primary/10">
                        <Eye size={16} aria-hidden="true" />
                      </Link>
                      {purchase.status === "RECEIVED" && (
                        <Link href={`/pembelian/${purchase.id}/retur`} title="Retur pembelian" aria-label={`Retur pembelian ${purchase.purchaseNumber}`} className="grid size-8 place-items-center rounded-md text-amber-700 hover:bg-amber-50">
                          <RotateCcw size={16} aria-hidden="true" />
                        </Link>
                      )}
                      {purchase.remainingDebt.greaterThan(0) && (
                        <Link href={`/pembelian/${purchase.id}/bayar`} className="ml-1 text-xs font-medium text-primary hover:underline">
                          Bayar
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!purchases.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">
                    {selectedSupplier
                      ? `Belum ada transaksi pembelian untuk supplier ${selectedSupplier}.`
                      : "Belum ada transaksi pembelian."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
