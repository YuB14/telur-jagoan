import { Prisma } from "@/generated/prisma/client";

type DecimalInput = string | number | Prisma.Decimal;

type PurchaseStockMovementAuditInput = {
  movementType: string;
  quantityIn: DecimalInput;
  quantityOut: DecimalInput;
  stockBefore: DecimalInput;
  stockAfter: DecimalInput;
  inventoryBatchId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  expectedPurchaseId?: string;
  batchInitialQuantity?: DecimalInput;
  purchaseBaseQuantity?: DecimalInput;
};

export function auditPurchaseStockMovement(input: PurchaseStockMovementAuditInput) {
  const issues: string[] = [];
  const quantityIn = new Prisma.Decimal(input.quantityIn);
  const quantityOut = new Prisma.Decimal(input.quantityOut);
  const stockBefore = new Prisma.Decimal(input.stockBefore);
  const stockAfter = new Prisma.Decimal(input.stockAfter);

  if (input.movementType !== "PURCHASE") issues.push("Tipe movement bukan PURCHASE.");
  if (!input.inventoryBatchId) issues.push("Movement tidak terhubung ke batch.");
  if (input.referenceType !== "PURCHASE") issues.push("Jenis referensi bukan PURCHASE.");
  if (!input.referenceId) issues.push("Referensi pembelian tidak tersedia.");
  if (input.expectedPurchaseId && input.referenceId !== input.expectedPurchaseId) {
    issues.push("Referensi movement tidak cocok dengan pembelian batch.");
  }
  if (quantityIn.lessThanOrEqualTo(0)) issues.push("Jumlah stok masuk harus lebih dari 0.");
  if (!quantityOut.isZero()) issues.push("Movement pembelian tidak boleh memiliki stok keluar.");
  if (!stockAfter.equals(stockBefore.add(quantityIn))) {
    issues.push("Saldo akhir tidak sama dengan saldo awal ditambah stok masuk.");
  }
  if (
    input.batchInitialQuantity !== undefined &&
    !quantityIn.equals(new Prisma.Decimal(input.batchInitialQuantity))
  ) {
    issues.push("Jumlah movement tidak sama dengan jumlah awal batch.");
  }
  if (
    input.purchaseBaseQuantity !== undefined &&
    !quantityIn.equals(new Prisma.Decimal(input.purchaseBaseQuantity))
  ) {
    issues.push("Jumlah movement tidak sama dengan jumlah dasar item pembelian.");
  }

  return issues;
}
