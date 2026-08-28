import type { Metadata } from "next";

import { listSupplierPaymentHistory } from "@/server/services/purchases";

export const metadata: Metadata = { title: "Pembayaran Supplier | Telur Jagoan" };
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });

export default async function SupplierPaymentsPage() {
  const payments = await listSupplierPaymentHistory();

  return (
    <div className="mx-auto max-w-[1300px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Pembelian</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pembayaran Supplier</h1>
        <p className="mt-2 text-sm text-muted-foreground">Riwayat pembayaran awal dan cicilan Supplier yang tidak dapat dihapus dari UI.</p>
      </header>
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Nomor bukti</th>
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-5 py-3 font-medium">Supplier / Pembelian</th>
                <th className="px-5 py-3 font-medium">Metode</th>
                <th className="px-5 py-3 font-medium">Referensi</th>
                <th className="px-5 py-3 text-right font-medium">Jumlah</th>
                <th className="px-5 py-3 font-medium">Dicatat oleh</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t hover:bg-muted/30">
                  <td className="px-5 py-4 font-semibold">{payment.paymentNumber}</td>
                  <td className="px-5 py-4">{date.format(payment.paymentDate)}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium">{payment.purchase.supplier.name}</p>
                    <p className="text-xs text-muted-foreground">{payment.purchase.purchaseNumber}</p>
                  </td>
                  <td className="px-5 py-4">{payment.paymentMethod.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{payment.referenceNumber ?? "—"}</td>
                  <td className="px-5 py-4 text-right font-semibold">{currency.format(Number(payment.amount))}</td>
                  <td className="px-5 py-4">{payment.creator.name}</td>
                </tr>
              ))}
              {!payments.length && (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">Belum ada pembayaran Supplier.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
