import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPurchaseDetail } from "@/server/services/purchases";
import { purchaseIdSchema } from "@/server/validations/purchase";

export const metadata: Metadata = { title: "Detail Pembelian | Telur Jagoan" };

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

export default async function PurchaseDetailPage({ params }: PageProps<"/pembelian/[id]">) {
  const { id } = await params;
  const parsedId = purchaseIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const purchase = await getPurchaseDetail(parsedId.data);
  if (!purchase) notFound();

  return (
    <div className="mx-auto max-w-[1200px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Pembelian</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{purchase.purchaseNumber}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {purchase.supplierName} · {dateFormatter.format(purchase.purchaseDate)}
          </p>
        </div>
        <Link href="/pembelian" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Kembali
        </Link>
      </header>

      <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Supplier snapshot</p>
          <p className="mt-1 font-semibold">{purchase.supplierName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Supplier internal</p>
          <p className="mt-1 font-semibold">{purchase.supplier.supplierCode}</p>
          <p className="text-xs text-muted-foreground">{purchase.supplier.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status pembayaran</p>
          <p className="mt-1 font-semibold">{purchase.paymentStatus}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Sisa hutang</p>
          <p className="mt-1 font-semibold">{currencyFormatter.format(Number(purchase.remainingDebt))}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Item Pembelian</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Produk</th>
                <th className="px-5 py-3 font-medium">Satuan</th>
                <th className="px-5 py-3 text-right font-medium">Jumlah</th>
                <th className="px-5 py-3 text-right font-medium">Harga</th>
                <th className="px-5 py-3 text-right font-medium">Subtotal</th>
                <th className="px-5 py-3 font-medium">Batch</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr key={item.id} className="border-t align-top">
                  <td className="px-5 py-4">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.productCode}</p>
                  </td>
                  <td className="px-5 py-4">{item.productUnit.unitName}</td>
                  <td className="px-5 py-4 text-right">{item.quantity.toString()}</td>
                  <td className="px-5 py-4 text-right">{currencyFormatter.format(Number(item.unitCost))}</td>
                  <td className="px-5 py-4 text-right font-medium">{currencyFormatter.format(Number(item.subtotal))}</td>
                  <td className="px-5 py-4 text-xs">
                    {item.inventoryBatches.map((batch) => (
                      <p key={batch.id}>{batch.batchNumber} · sisa {batch.remainingQuantity.toString()}</p>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Pembayaran</h2>
          <div className="mt-4 space-y-3 text-sm">
            {purchase.payments.map((payment) => (
              <div key={payment.id} className="rounded-lg border p-3">
                <div className="flex justify-between gap-4">
                  <span className="font-medium">{payment.paymentNumber}</span>
                  <span>{currencyFormatter.format(Number(payment.amount))}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dateFormatter.format(payment.paymentDate)} · {payment.paymentMethod.name}
                </p>
                {payment.receiptUrl && (
                  <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                    Lihat bukti pembayaran
                  </a>
                )}
              </div>
            ))}
            {!purchase.payments.length && <p className="text-sm text-muted-foreground">Belum ada pembayaran.</p>}
          </div>
        </section>

        <dl className="space-y-3 rounded-xl border bg-card p-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{currencyFormatter.format(Number(purchase.subtotal))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Diskon</dt>
            <dd>-{currencyFormatter.format(Number(purchase.discountAmount))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Ongkir + biaya lain</dt>
            <dd>{currencyFormatter.format(Number(purchase.shippingCost.add(purchase.otherCost)))}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t pt-3 text-base">
            <dt className="font-semibold">Grand total</dt>
            <dd className="font-bold text-primary">{currencyFormatter.format(Number(purchase.grandTotal))}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
