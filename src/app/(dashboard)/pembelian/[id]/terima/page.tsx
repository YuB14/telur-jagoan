import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PurchaseReceiptForm } from "@/components/purchase/purchase-receipt-form";
import { getPurchaseReceiptData } from "@/server/services/purchases";
import { purchaseIdSchema } from "@/server/validations/purchase";

export const metadata: Metadata = {
  title: "Terima Pembelian | Telur Jagoan",
};

function toDateInput(date: Date | null) {
  return date?.toISOString().slice(0, 10) ?? null;
}

export default async function ReceivePurchasePage({
  params,
}: PageProps<"/pembelian/[id]/terima">) {
  const { id } = await params;
  const parsedId = purchaseIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const { purchase, paymentMethods } = await getPurchaseReceiptData(parsedId.data);
  if (!purchase || purchase.status !== "DRAFT") notFound();

  return (
    <div className="mx-auto max-w-[1200px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Pembelian</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Terima Pembelian</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tentukan pembayaran awal sebelum batch dan stok masuk dibuat.
        </p>
      </header>

      <PurchaseReceiptForm
        purchase={{
          ...purchase,
          purchaseDate: toDateInput(purchase.purchaseDate) ?? "",
          dueDate: toDateInput(purchase.dueDate),
          grandTotal: purchase.grandTotal.toString(),
          items: purchase.items.map((item) => ({
            ...item,
            quantity: item.quantity.toString(),
            unitCost: item.unitCost.toString(),
            subtotal: item.subtotal.toString(),
          })),
        }}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}
