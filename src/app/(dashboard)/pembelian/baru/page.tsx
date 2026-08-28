import type { Metadata } from "next";

import { PurchaseForm } from "@/components/purchase/purchase-form";
import { listPurchaseFormOptions } from "@/server/services/purchases";

export const metadata: Metadata = {
  title: "Pembelian Baru | Telur Jagoan",
};

function getJakartaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function NewPurchasePage() {
  const { products, paymentMethods } = await listPurchaseFormOptions();

  return (
    <div className="mx-auto max-w-[1400px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Pembelian</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pembelian Baru</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Catat pembelian/kulakan dari supplier, pembayaran, dan stok masuk dalam satu alur.
        </p>
      </header>

      {(!products.length || !paymentMethods.length) && (
        <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {!products.length
            ? "Belum ada Produk dengan Satuan aktif. Lengkapi master Produk dan Satuan terlebih dahulu."
            : "Belum ada metode pembayaran CASH/QRIS/TRANSFER aktif. Lengkapi metode pembayaran terlebih dahulu."}
        </p>
      )}

      <PurchaseForm
        products={products}
        paymentMethods={paymentMethods}
        defaultPurchaseDate={getJakartaDate()}
      />
    </div>
  );
}
