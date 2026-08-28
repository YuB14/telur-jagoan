import Link from "next/link";
import { Eye, Printer, RotateCcw } from "lucide-react";

import { CancelSaleForm } from "@/components/sales/cancel-sale-form";
import type { AppRole } from "@/lib/permissions";
import { printSaleReceiptAction } from "@/server/actions/sales";
import type { listSales } from "@/server/services/sales";

type SaleListItem = Awaited<ReturnType<typeof listSales>>["sales"][number];

type SalesTableProps = {
  sales: SaleListItem[];
  role: AppRole;
  emptyMessage: string;
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function SalesTable({ sales, role, emptyMessage }: SalesTableProps) {
  const isOwner = role === "OWNER";

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Nomor</th>
              <th className="px-5 py-3 font-medium">Waktu</th>
              <th className="px-5 py-3 font-medium">Pelanggan</th>
              <th className="px-5 py-3 font-medium">Kasir</th>
              <th className="px-5 py-3 font-medium">Pembayaran</th>
              <th className="px-5 py-3 text-right font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-t align-top hover:bg-muted/30">
                <td className="px-5 py-4">
                  <p className="font-semibold">{sale.saleNumber}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {sale._count.items} item - Cetak {sale.printCount}x
                  </p>
                </td>
                <td className="px-5 py-4">{dateTimeFormatter.format(sale.saleDate)}</td>
                <td className="px-5 py-4">{sale.customer.name}</td>
                <td className="px-5 py-4">{sale.cashier.name}</td>
                <td className="px-5 py-4">
                  {sale.payments.map((payment) => (
                    <p key={`${sale.id}-${payment.paymentMethod.name}-${payment.amount.toString()}`} className="text-xs">
                      {payment.paymentMethod.name}: {currencyFormatter.format(Number(payment.amount))}
                    </p>
                  ))}
                  {!sale.payments.length && <span className="text-xs text-muted-foreground">Belum ada data</span>}
                </td>
                <td className="px-5 py-4 text-right font-medium">
                  {currencyFormatter.format(Number(sale.grandTotal))}
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    sale.status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-700"
                      : sale.status === "CANCELLED"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-amber-50 text-amber-700"
                  }`}>
                    {sale.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                      href={`/penjualan/${sale.id}`}
                      title="Lihat detail penjualan"
                      aria-label={`Lihat detail ${sale.saleNumber}`}
                      className="grid size-8 place-items-center rounded-md text-primary hover:bg-primary/10"
                    >
                      <Eye size={16} aria-hidden="true" />
                    </Link>
                    <form action={printSaleReceiptAction}>
                      <input type="hidden" name="saleId" value={sale.id} />
                      <button
                        type="submit"
                        title="Cetak ulang struk"
                        aria-label={`Cetak ulang struk ${sale.saleNumber}`}
                        className="grid size-8 place-items-center rounded-md text-primary hover:bg-primary/10"
                      >
                        <Printer size={16} aria-hidden="true" />
                      </button>
                    </form>
                    {isOwner && sale.status === "COMPLETED" && (
                      <>
                        <CancelSaleForm saleId={sale.id} saleNumber={sale.saleNumber} />
                        <Link
                          href={`/penjualan/${sale.id}/retur`}
                          title="Retur penjualan"
                          aria-label={`Retur penjualan ${sale.saleNumber}`}
                          className="grid size-8 place-items-center rounded-md text-amber-700 hover:bg-amber-50"
                        >
                          <RotateCcw size={16} aria-hidden="true" />
                        </Link>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!sales.length && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
