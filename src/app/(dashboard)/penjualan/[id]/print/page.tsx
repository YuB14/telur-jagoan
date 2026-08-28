import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReceiptAutoPrint } from "@/components/sales/receipt-auto-print";
import { ReceiptPrintActions } from "@/components/sales/receipt-print-actions";
import { getSaleDetail, SaleServiceError } from "@/server/services/sales";
import { getReceiptPrintSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Cetak Struk Penjualan | Telur Jagoan" };

type SalePrintPageProps = { params: Promise<{ id: string }> };

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "short",
  timeStyle: "short",
});

export default async function SalePrintPage({ params }: SalePrintPageProps) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof getSaleDetail>>;

  try {
    data = await getSaleDetail(id);
  } catch (error) {
    if (error instanceof SaleServiceError) notFound();
    throw error;
  }

  const [{ sale, items }, settings] = await Promise.all([
    Promise.resolve(data),
    getReceiptPrintSettings(),
  ]);

  return (
    <div className="mx-auto max-w-[360px] space-y-4 print:max-w-none">
      <ReceiptAutoPrint />

      <article className="receipt rounded-xl border bg-white p-4 font-mono text-[12px] leading-5 text-black print:border-0 print:p-0">
        <div className="text-center">
          {settings.logoUrl && (
            <div className="mb-2 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.logoUrl}
                alt="Logo Toko"
                className="max-h-16 max-w-[120px] object-contain"
              />
            </div>
          )}
          <p className="text-base font-bold">{settings.storeName}</p>
          {settings.address && <p>{settings.address}</p>}
          {settings.phone && <p>Telp: {settings.phone}</p>}
          <p className="mt-1 font-semibold">Struk Penjualan</p>
        </div>
        <div className="my-3 border-t border-dashed border-black" />
        <p>No: {sale.saleNumber}</p>
        <p>Tanggal: {dateTimeFormatter.format(sale.saleDate)}</p>
        <p>Kasir: {sale.cashier.name}</p>
        <p>Pelanggan: {sale.customer.name}</p>
        <div className="my-3 border-t border-dashed border-black" />
        {items.map((item) => (
          <div key={item.id} className="mb-2">
            <p>{item.productNameSnapshot}</p>
            <div className="flex justify-between gap-3">
              <span>
                {item.quantity.toString()} {item.unitNameSnapshot} x {currencyFormatter.format(Number(item.unitPrice))}
              </span>
              <span>{currencyFormatter.format(Number(item.subtotal))}</span>
            </div>
          </div>
        ))}
        <div className="my-3 border-t border-dashed border-black" />
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{currencyFormatter.format(Number(sale.subtotal))}</span>
        </div>
        <div className="flex justify-between">
          <span>Diskon</span>
          <span>-{currencyFormatter.format(Number(sale.discountAmount))}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{currencyFormatter.format(Number(sale.grandTotal))}</span>
        </div>
        <div className="my-3 border-t border-dashed border-black" />
        {sale.payments.map((payment) => (
          <div key={`${payment.paymentMethod.name}-${payment.paidAt.toISOString()}`} className="flex justify-between">
            <span>{payment.paymentMethod.name}</span>
            <span>{currencyFormatter.format(Number(payment.amount))}</span>
          </div>
        ))}
        <div className="flex justify-between">
          <span>Kembali</span>
          <span>{currencyFormatter.format(Number(sale.changeAmount))}</span>
        </div>
        <div className="my-3 border-t border-dashed border-black" />
        <p className="text-center">{settings.receiptFooter ?? "Terima kasih telah berbelanja"}</p>
      </article>
      <ReceiptPrintActions />
    </div>
  );
}
