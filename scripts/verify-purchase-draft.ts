import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { formatDatedNumber, getNextDatedSequence } from "../src/lib/inventory-number";
import { calculateSupplierDebtPayment } from "../src/lib/purchase-debt";
import { getNextPurchaseNumber } from "../src/lib/purchase-number";
import { auditPurchaseStockMovement } from "../src/lib/stock-movement";
import {
  purchaseDraftFormSchema,
  purchaseReceiptFormSchema,
  supplierDebtPaymentFormSchema,
} from "../src/server/validations/purchase";

loadEnvConfig(process.cwd(), true);

const validUuid = "11111111-1111-4111-8111-111111111111";
const firstItem = {
  productUnitId: validUuid,
  quantity: "2.500",
  unitCost: "30000",
  discountAmount: "0",
  expiryDate: "2026-09-01",
};
const validInput = {
  supplierId: validUuid,
  supplierInvoiceNumber: "INV-001",
  purchaseDate: "2026-08-06",
  dueDate: "2026-08-20",
  discountAmount: "1000",
  shippingCost: "5000",
  otherCost: "0",
  notes: "Uji",
  items: JSON.stringify([
    firstItem,
    {
      ...firstItem,
      productUnitId: "22222222-2222-4222-8222-222222222222",
      quantity: "1",
      unitCost: "45000.50",
      discountAmount: "500.25",
      expiryDate: "",
    },
  ]),
};

const cases = [
  ["multi-item valid", validInput, true],
  ["items kosong", { ...validInput, items: "[]" }, false],
  ["JSON rusak", { ...validInput, items: "{" }, false],
  ["jumlah nol", { ...validInput, items: JSON.stringify([{ ...firstItem, quantity: "0" }]) }, false],
  ["harga nol", { ...validInput, items: JSON.stringify([{ ...firstItem, unitCost: "0" }]) }, false],
  ["jatuh tempo awal", { ...validInput, dueDate: "2026-08-05" }, false],
  ["supplier bukan UUID", { ...validInput, supplierId: "supplier" }, false],
] as const;

for (const [name, input, expected] of cases) {
  if (purchaseDraftFormSchema.safeParse(input).success !== expected) {
    throw new Error(`Kasus validasi gagal: ${name}`);
  }
}

const receiptCases = [
  ["UNPAID valid", { paymentStatus: "UNPAID", amountPaid: "0", paymentMethodId: "", dueDate: "2026-08-20", referenceNumber: "", paymentNotes: "" }, true],
  ["UNPAID field kondisional null", { paymentStatus: "UNPAID", amountPaid: "0", paymentMethodId: null, dueDate: null, referenceNumber: null, paymentNotes: null }, true],
  ["UNPAID dengan nominal", { paymentStatus: "UNPAID", amountPaid: "1", paymentMethodId: "", dueDate: "", referenceNumber: "", paymentNotes: "" }, false],
  ["PARTIAL valid", { paymentStatus: "PARTIAL", amountPaid: "400", paymentMethodId: validUuid, dueDate: "", referenceNumber: "REF", paymentNotes: "" }, true],
  ["PARTIAL nol", { paymentStatus: "PARTIAL", amountPaid: "0", paymentMethodId: validUuid, dueDate: "", referenceNumber: "", paymentNotes: "" }, false],
  ["PAID valid", { paymentStatus: "PAID", amountPaid: "1000", paymentMethodId: validUuid, dueDate: "", referenceNumber: "", paymentNotes: "" }, true],
  ["PAID tanpa metode", { paymentStatus: "PAID", amountPaid: "1000", paymentMethodId: "", dueDate: "", referenceNumber: "", paymentNotes: "" }, false],
] as const;

for (const [name, input, expected] of receiptCases) {
  if (purchaseReceiptFormSchema.safeParse(input).success !== expected) {
    throw new Error(`Kasus status pembayaran gagal: ${name}`);
  }
}

const debtFormCases = [
  ["cicilan valid", { paymentDate: "2026-08-07", amount: "250", paymentMethodId: validUuid, referenceNumber: "", notes: "" }, true],
  ["cicilan nol", { paymentDate: "2026-08-07", amount: "0", paymentMethodId: validUuid, referenceNumber: "", notes: "" }, false],
  ["metode cicilan invalid", { paymentDate: "2026-08-07", amount: "250", paymentMethodId: "cash", referenceNumber: "", notes: "" }, false],
] as const;

for (const [name, input, expected] of debtFormCases) {
  if (supplierDebtPaymentFormSchema.safeParse(input).success !== expected) {
    throw new Error(`Kasus form cicilan gagal: ${name}`);
  }
}

const partialCalculation = calculateSupplierDebtPayment(
  new Prisma.Decimal(400),
  new Prisma.Decimal(600),
  new Prisma.Decimal(200),
);
const paidCalculation = calculateSupplierDebtPayment(
  new Prisma.Decimal(400),
  new Prisma.Decimal(600),
  new Prisma.Decimal(600),
);
const overpaymentCalculation = calculateSupplierDebtPayment(
  new Prisma.Decimal(400),
  new Prisma.Decimal(600),
  new Prisma.Decimal(601),
);
if (
  !partialCalculation.success ||
  partialCalculation.paymentStatus !== "PARTIAL" ||
  !partialCalculation.remainingDebt.equals(400) ||
  !paidCalculation.success ||
  paidCalculation.paymentStatus !== "PAID" ||
  !paidCalculation.remainingDebt.isZero() ||
  overpaymentCalculation.success
) {
  throw new Error("Kalkulasi batas cicilan gagal.");
}

const nextNumber = getNextPurchaseNumber(
  ["TJ-PUR-20260806-0001", "TJ-PUR-20260806-0003", "TJ-PUR-20260805-0099"],
  "2026-08-06",
);
if (nextNumber !== "TJ-PUR-20260806-0004") {
  throw new Error(`Generator nomor gagal: ${nextNumber}`);
}
if (
  getNextDatedSequence(["TJ-BAT-20260806-0002"], "BAT", "20260806") !== 3 ||
  formatDatedNumber("STK", "20260806", 7) !== "TJ-STK-20260806-0007"
  || formatDatedNumber("PAY", "20260806", 8) !== "TJ-PAY-20260806-0008"
) {
  throw new Error("Generator nomor batch/movement gagal.");
}

const validMovement = {
  movementType: "PURCHASE",
  quantityIn: "12.500",
  quantityOut: "0",
  stockBefore: "5",
  stockAfter: "17.500",
  inventoryBatchId: validUuid,
  referenceType: "PURCHASE",
  referenceId: validUuid,
  expectedPurchaseId: validUuid,
  batchInitialQuantity: "12.500",
  purchaseBaseQuantity: "12.500",
};
if (auditPurchaseStockMovement(validMovement).length !== 0) {
  throw new Error("Movement pembelian valid terdeteksi tidak konsisten.");
}
if (
  auditPurchaseStockMovement({ ...validMovement, stockAfter: "16" }).length === 0 ||
  auditPurchaseStockMovement({ ...validMovement, quantityOut: "1" }).length === 0 ||
  auditPurchaseStockMovement({ ...validMovement, inventoryBatchId: null }).length === 0
) {
  throw new Error("Audit movement gagal mendeteksi data yang tidak konsisten.");
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum dikonfigurasi.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const rollbackMarker = "ROLLBACK_PURCHASE_VERIFY";
  let testNumber = "";

  try {
  await db.$transaction(async (transaction) => {
    const owner = await transaction.user.findFirst({
      where: { role: "OWNER", isActive: true },
      select: { id: true },
    });
    if (!owner) throw new Error("Akun Owner aktif belum tersedia.");

    const supplier =
      (await transaction.supplier.findFirst({
        where: { isActive: true },
        select: { id: true, name: true },
      })) ??
      (await transaction.supplier.create({
        data: {
          supplierCode: `SUP-VERIFY-${String(Date.now()).slice(-6)}`,
          name: "Supplier Verifikasi",
        },
        select: { id: true, name: true },
      }));

    const paymentMethod =
      (await transaction.paymentMethod.findFirst({
        where: { isActive: true },
        select: { id: true },
      })) ??
      (await transaction.paymentMethod.create({
        data: {
          code: `PAY-VERIFY-${String(Date.now()).slice(-6)}`,
          name: "Pembayaran Verifikasi",
          type: "CASH",
        },
        select: { id: true },
      }));

    const unit =
      (await transaction.productUnit.findFirst({
        where: { isActive: true, isBaseUnit: true, product: { isActive: true } },
        select: {
          id: true,
          productId: true,
          conversionToBase: true,
          product: { select: { currentStock: true } },
        },
      })) ??
      (
        await transaction.product.create({
          data: {
            productCode: `PRD-VERIFY-${String(Date.now()).slice(-6)}`,
            name: "Produk Verifikasi",
            baseUnitName: "BUTIR",
            units: {
              create: {
                unitName: "BUTIR",
                conversionToBase: 1,
                sellingPrice: 2000,
                isBaseUnit: true,
              },
            },
          },
          select: {
            currentStock: true,
            units: {
              select: {
                id: true,
                productId: true,
                conversionToBase: true,
                product: { select: { currentStock: true } },
              },
            },
          },
        })
      ).units[0];

    testNumber = `TJ-PUR-20991231-${String(Date.now()).slice(-8)}`;
    const unitCost = unit.conversionToBase.mul(1000);
    const created = await transaction.purchase.create({
      data: {
        purchaseNumber: testNumber,
        supplierId: supplier.id,
        supplierName: supplier.name,
        purchaseDate: new Date("2099-12-31T00:00:00.000Z"),
        subtotal: unitCost,
        grandTotal: unitCost,
        createdBy: owner.id,
        items: {
          create: {
            productId: unit.productId,
            productUnitId: unit.id,
            quantity: 1,
            conversionToBase: unit.conversionToBase,
            baseQuantity: unit.conversionToBase,
            unitCost,
            baseUnitCost: new Prisma.Decimal(1000),
            subtotal: unitCost,
          },
        },
      },
      select: {
        id: true,
        purchaseDate: true,
        grandTotal: true,
        items: true,
      },
    });
    const stockAfter = await transaction.product.findUniqueOrThrow({
      where: { id: unit.productId },
      select: { currentStock: true },
    });

    if (created.items.length !== 1 || !stockAfter.currentStock.equals(unit.product.currentStock)) {
      throw new Error("Relasi item atau isolasi stok draft tidak valid.");
    }

    const receivedStock = stockAfter.currentStock.add(created.items[0].baseQuantity);
    const batch = await transaction.inventoryBatch.create({
      data: {
        batchNumber: `TJ-BAT-20991231-${String(Date.now()).slice(-8)}`,
        productId: unit.productId,
        purchaseItemId: created.items[0].id,
        supplierId: supplier.id,
        receivedDate: created.purchaseDate,
        initialQuantity: created.items[0].baseQuantity,
        remainingQuantity: created.items[0].baseQuantity,
        baseUnitCost: created.items[0].baseUnitCost,
      },
    });
    await transaction.product.update({
      where: { id: unit.productId },
      data: { currentStock: receivedStock },
    });
    await transaction.stockMovement.create({
      data: {
        movementNumber: `TJ-STK-20991231-${String(Date.now()).slice(-8)}`,
        productId: unit.productId,
        inventoryBatchId: batch.id,
        movementType: "PURCHASE",
        quantityIn: created.items[0].baseQuantity,
        stockBefore: stockAfter.currentStock,
        stockAfter: receivedStock,
        referenceType: "PURCHASE",
        referenceId: created.id,
        createdBy: owner.id,
      },
    });
    const partialPayment = new Prisma.Decimal(400);
    await transaction.purchase.update({
      where: { id: created.id },
      data: {
        status: "RECEIVED",
        amountPaid: partialPayment,
        remainingDebt: created.grandTotal.sub(partialPayment),
        paymentStatus: "PARTIAL",
      },
    });
    await transaction.purchasePayment.create({
      data: {
        paymentNumber: `TJ-PAY-20991231-${String(Date.now()).slice(-8)}`,
        purchaseId: created.id,
        paymentMethodId: paymentMethod.id,
        paymentDate: created.purchaseDate,
        amount: partialPayment,
        createdBy: owner.id,
      },
    });
    const received = await transaction.purchase.findUniqueOrThrow({
      where: { id: created.id },
      select: {
        status: true,
        amountPaid: true,
        remainingDebt: true,
        payments: true,
        items: {
          select: {
            baseQuantity: true,
            inventoryBatches: {
              select: {
                id: true,
                initialQuantity: true,
                stockMovements: true,
              },
            },
          },
        },
      },
    });
    const receivedBatch = received.items[0].inventoryBatches[0];
    const receivedMovement = receivedBatch?.stockMovements[0];
    if (
      received.status !== "RECEIVED" ||
      !received.amountPaid.equals(partialPayment) ||
      !received.remainingDebt.equals(created.grandTotal.sub(partialPayment)) ||
      received.payments.length !== 1 ||
      receivedBatch?.stockMovements.length !== 1 ||
      !receivedBatch.initialQuantity.equals(received.items[0].baseQuantity) ||
      !receivedMovement ||
      auditPurchaseStockMovement({
        ...receivedMovement,
        expectedPurchaseId: created.id,
        batchInitialQuantity: receivedBatch.initialQuantity,
        purchaseBaseQuantity: received.items[0].baseQuantity,
      }).length !== 0
    ) {
      throw new Error("Integrasi penerimaan batch/stok/movement tidak valid.");
    }

    const finalCalculation = calculateSupplierDebtPayment(
      received.amountPaid,
      received.remainingDebt,
      received.remainingDebt,
    );
    if (!finalCalculation.success) throw new Error(finalCalculation.error);

    await transaction.purchasePayment.create({
      data: {
        paymentNumber: `TJ-PAY-20991231-${String(Date.now()).slice(-8)}2`,
        purchaseId: created.id,
        paymentMethodId: paymentMethod.id,
        paymentDate: created.purchaseDate,
        amount: received.remainingDebt,
        createdBy: owner.id,
      },
    });
    await transaction.purchase.update({
      where: { id: created.id },
      data: {
        amountPaid: finalCalculation.amountPaid,
        remainingDebt: finalCalculation.remainingDebt,
        paymentStatus: finalCalculation.paymentStatus,
      },
    });
    const paid = await transaction.purchase.findUniqueOrThrow({
      where: { id: created.id },
      select: { amountPaid: true, remainingDebt: true, paymentStatus: true, payments: true },
    });
    if (
      paid.paymentStatus !== "PAID" ||
      !paid.amountPaid.equals(created.grandTotal) ||
      !paid.remainingDebt.isZero() ||
      paid.payments.length !== 2
    ) {
      throw new Error("Integrasi pelunasan hutang tidak valid.");
    }
    throw new Error(rollbackMarker);
  });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== rollbackMarker) throw error;
  } finally {
    const leaked = testNumber
      ? await db.purchase.findUnique({ where: { purchaseNumber: testNumber }, select: { id: true } })
      : null;
    await db.$disconnect();
    if (leaked) throw new Error("Record uji tidak ter-rollback.");
  }

  const totalCases = cases.length + receiptCases.length + debtFormCases.length + 7;
  console.log(`Validasi pembelian: ${totalCases}/${totalCases} kasus lulus; audit stok masuk, cicilan, pelunasan, dan rollback lulus.`);
}

void main();
