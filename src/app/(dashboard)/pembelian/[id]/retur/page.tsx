import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PurchaseReturnForm } from "@/components/purchase/purchase-return-form";
import { getPurchaseReturnData } from "@/server/services/purchases";
import { purchaseIdSchema } from "@/server/validations/purchase";

export const metadata: Metadata = { title: "Retur Pembelian | Telur Jagoan" };

export default async function PurchaseReturnPage({ params }: PageProps<"/pembelian/[id]/retur">) {
  const { id } = await params;
  const parsedId = purchaseIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const purchase = await getPurchaseReturnData(parsedId.data);
  if (!purchase || purchase.status !== "RECEIVED") notFound();

  const returnableItems = purchase.items.flatMap((item) =>
    item.inventoryBatches
      .filter((batch) => batch.remainingQuantity.greaterThan(0))
      .map((batch) => ({
        purchaseItemId: item.id,
        inventoryBatchId: batch.id,
        label: item.product.name,
        batchNumber: batch.batchNumber,
        maxQuantity: batch.remainingQuantity.toString(),
        baseUnitName: item.product.baseUnitName,
      })),
  );

  return (
    <div className="mx-auto max-w-[1100px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Pembelian</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Retur Pembelian {purchase.purchaseNumber}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Retur mengurangi stok batch terkait dan menyesuaikan hutang jika memilih potong hutang supplier.
        </p>
      </header>

      <PurchaseReturnForm
        purchaseId={purchase.id}
        purchaseNumber={purchase.purchaseNumber}
        items={returnableItems}
      />
    </div>
  );
}
