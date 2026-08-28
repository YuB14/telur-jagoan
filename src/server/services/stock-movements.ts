import "server-only";

import { auditPurchaseStockMovement } from "@/lib/stock-movement";
import { db } from "@/lib/db";
import { requireOwner } from "@/server/services/authorization";

export async function listStockMovements() {
  await requireOwner();

  const [movements, receivedItems] = await Promise.all([
    db.stockMovement.findMany({
      take: 250,
      orderBy: [{ createdAt: "desc" }, { movementNumber: "desc" }],
      select: {
        id: true,
        movementNumber: true,
        movementType: true,
        quantityIn: true,
        quantityOut: true,
        stockBefore: true,
        stockAfter: true,
        referenceType: true,
        referenceId: true,
        description: true,
        createdAt: true,
        product: { select: { productCode: true, name: true, baseUnitName: true } },
        inventoryBatch: {
          select: {
            id: true,
            batchNumber: true,
            initialQuantity: true,
            purchaseItem: { select: { baseQuantity: true, purchaseId: true } },
          },
        },
        creator: { select: { name: true } },
      },
    }),
    db.purchaseItem.findMany({
      where: { purchase: { status: "RECEIVED" } },
      select: {
        id: true,
        baseQuantity: true,
        product: { select: { productCode: true, name: true } },
        purchase: { select: { id: true, purchaseNumber: true } },
        inventoryBatches: {
          select: {
            id: true,
            batchNumber: true,
            initialQuantity: true,
            stockMovements: {
              where: { movementType: "PURCHASE" },
              select: {
                movementNumber: true,
                movementType: true,
                quantityIn: true,
                quantityOut: true,
                stockBefore: true,
                stockAfter: true,
                inventoryBatchId: true,
                referenceType: true,
                referenceId: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const auditIssues: string[] = [];

  for (const item of receivedItems) {
    if (item.inventoryBatches.length !== 1) {
      auditIssues.push(
        `${item.purchase.purchaseNumber} / ${item.product.productCode}: harus memiliki tepat satu batch, ditemukan ${item.inventoryBatches.length}.`,
      );
    }

    for (const batch of item.inventoryBatches) {
      if (batch.stockMovements.length !== 1) {
        auditIssues.push(
          `${batch.batchNumber}: harus memiliki tepat satu movement PURCHASE, ditemukan ${batch.stockMovements.length}.`,
        );
      }

      for (const movement of batch.stockMovements) {
        const issues = auditPurchaseStockMovement({
          ...movement,
          expectedPurchaseId: item.purchase.id,
          batchInitialQuantity: batch.initialQuantity,
          purchaseBaseQuantity: item.baseQuantity,
        });
        auditIssues.push(
          ...issues.map((issue) => `${movement.movementNumber} (${item.product.name}): ${issue}`),
        );
      }
    }
  }

  return {
    movements,
    audit: {
      receivedItemCount: receivedItems.length,
      purchaseMovementCount: movements.filter((movement) => movement.movementType === "PURCHASE")
        .length,
      issues: auditIssues,
    },
  };
}
