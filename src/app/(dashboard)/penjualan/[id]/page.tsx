import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSaleDetail, SaleServiceError } from "@/server/services/sales";

export const metadata: Metadata = { title: "Detail Penjualan | Telur Jagoan" };

type SaleDetailPageProps = { params: Promise<{ id: string }> };

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof getSaleDetail>>;

  try {
    data = await getSaleDetail(id);
  } catch (error) {
    if (error instanceof SaleServiceError) notFound();
    throw error;
  }

  const { sale, items } = data;

  return (
    <div className="mx-auto max-w-[1100px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Penjualan</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{sale.saleNumber}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {dateTimeFormatter.format(sale.saleDate)} · {sale.status}
          </p>
        </div>
        <Link
          href="/penjualan"
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
        >
          Kembali
        </Link>
      </header>

      <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Kasir</p>
          <p className="mt-1 font-semibold">{sale.cashier.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pelanggan</p>
          <p className="mt-1 font-semibold">{sale.customer.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Sesi Kasir</p>
          <p className="mt-1 font-semibold">{sale.cashSession.sessionNumber}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Cetak Struk</p>
          <p className="mt-1 font-semibold">{sale.printCount}x</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 text-right font-medium">Jumlah</th>
              <th className="px-5 py-3 text-right font-medium">Harga</th>
              <th className="px-5 py-3 text-right font-medium">Diskon</th>
              <th className="px-5 py-3 text-right font-medium">Subtotal</th>
              <th className="px-5 py-3 text-right font-medium">Sudah Retur</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-5 py-4">
                  <p className="font-medium">{item.productNameSnapshot}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.unitNameSnapshot}</p>
                </td>
                <td className="px-5 py-4 text-right tabular-nums">{item.quantity.toString()}</td>
                <td className="px-5 py-4 text-right">{currencyFormatter.format(Number(item.unitPrice))}</td>
                <td className="px-5 py-4 text-right">{currencyFormatter.format(Number(item.discountAmount))}</td>
                <td className="px-5 py-4 text-right font-medium">{currencyFormatter.format(Number(item.subtotal))}</td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {item.returnedQuantity.toString()} {item.product.baseUnitName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Pembayaran</h2>
          <div className="mt-4 space-y-3 text-sm">
            {sale.payments.map((payment) => (
              <div key={`${payment.paymentMethod.name}-${payment.paidAt.toISOString()}`} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{payment.paymentMethod.name}</span>
                <span className="font-medium">{currencyFormatter.format(Number(payment.amount))}</span>
              </div>
            ))}
          </div>
        </div>

        <dl className="space-y-3 rounded-xl border bg-card p-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{currencyFormatter.format(Number(sale.subtotal))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Diskon</dt>
            <dd>-{currencyFormatter.format(Number(sale.discountAmount))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Pajak</dt>
            <dd>{currencyFormatter.format(Number(sale.taxAmount))}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t pt-3 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold text-primary">{currencyFormatter.format(Number(sale.grandTotal))}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
