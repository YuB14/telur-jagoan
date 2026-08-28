import { Prisma } from "@/generated/prisma/client";

export type DebtPaymentCalculation =
  | { success: false; error: string }
  | {
      success: true;
      amountPaid: Prisma.Decimal;
      remainingDebt: Prisma.Decimal;
      paymentStatus: "PARTIAL" | "PAID";
    };

export function calculateSupplierDebtPayment(
  currentAmountPaid: Prisma.Decimal,
  currentRemainingDebt: Prisma.Decimal,
  paymentAmount: Prisma.Decimal,
): DebtPaymentCalculation {
  if (paymentAmount.lessThanOrEqualTo(0)) {
    return { success: false, error: "Jumlah pembayaran harus lebih besar dari 0." };
  }

  if (currentRemainingDebt.lessThanOrEqualTo(0)) {
    return { success: false, error: "Hutang pembelian ini sudah lunas." };
  }

  if (paymentAmount.greaterThan(currentRemainingDebt)) {
    return { success: false, error: "Jumlah pembayaran tidak boleh melebihi sisa hutang." };
  }

  const remainingDebt = currentRemainingDebt.sub(paymentAmount);

  return {
    success: true,
    amountPaid: currentAmountPaid.add(paymentAmount),
    remainingDebt,
    paymentStatus: remainingDebt.isZero() ? "PAID" : "PARTIAL",
  };
}
