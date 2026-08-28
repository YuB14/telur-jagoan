import { Prisma } from "@/generated/prisma/client";

type DecimalInput = string | number | Prisma.Decimal;

export function calculateRestoredStock(currentStock: DecimalInput, restoredQuantity: DecimalInput) {
  return new Prisma.Decimal(currentStock).add(restoredQuantity);
}

export function calculateRefundCashEffect(expectedCash: DecimalInput, refundAmount: DecimalInput) {
  return new Prisma.Decimal(expectedCash).sub(refundAmount);
}

export function calculateReturnSubtotal(quantity: DecimalInput, unitPrice: DecimalInput) {
  return new Prisma.Decimal(quantity).mul(unitPrice);
}
