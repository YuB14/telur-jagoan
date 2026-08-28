import { Prisma } from "../src/generated/prisma/client";
import {
  calculateRefundCashEffect,
  calculateRestoredStock,
  calculateReturnSubtotal,
} from "../src/lib/sale-reversal";

function assertDecimalEquals(actual: Prisma.Decimal, expected: string, message: string) {
  if (!actual.equals(expected)) {
    throw new Error(`${message}. Expected ${expected}, got ${actual.toString()}`);
  }
}

function verifyCancellationRestoresStock() {
  const currentStock = new Prisma.Decimal("12.500");
  const cancelledQuantity = new Prisma.Decimal("7.250");
  const restoredStock = calculateRestoredStock(currentStock, cancelledQuantity);

  assertDecimalEquals(
    restoredStock,
    "19.750",
    "Pembatalan penjualan harus mengembalikan stok sebesar quantity dari batch asal",
  );
}

function verifyReturnReducesCash() {
  const expectedCashBeforeReturn = new Prisma.Decimal("500000.00");
  const returnCashRefund = new Prisma.Decimal("42500.00");
  const expectedCashAfterReturn = calculateRefundCashEffect(
    expectedCashBeforeReturn,
    returnCashRefund,
  );

  assertDecimalEquals(
    expectedCashAfterReturn,
    "457500.00",
    "Retur penjualan harus mengurangi kas sebesar nilai refund",
  );
}

function verifyReturnSubtotalUsesBaseQuantity() {
  const subtotal = calculateReturnSubtotal("1.500", "28000.00");

  assertDecimalEquals(
    subtotal,
    "42000.00000",
    "Subtotal retur harus dihitung dari quantity retur dikali harga per satuan dasar",
  );
}

verifyCancellationRestoresStock();
verifyReturnReducesCash();
verifyReturnSubtotalUsesBaseQuantity();

console.info("Verifikasi pembatalan/retur penjualan berhasil.");
