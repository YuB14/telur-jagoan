import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatDatedNumber,
  getDatedNumberPrefix,
  getNextDatedSequence,
} from "@/lib/inventory-number";
import {
  getNextPurchaseNumber,
  getPurchaseNumberPrefix,
} from "@/lib/purchase-number";
import { calculateSupplierDebtPayment } from "@/lib/purchase-debt";
import { getNextSupplierCode } from "@/lib/supplier-code";
import { isAppRole } from "@/lib/permissions";
import { requireOwner } from "@/server/services/authorization";
import type {
  PurchaseDraftFormInput,
  PurchaseReturnFormInput,
  PurchaseReceiptFormInput,
  SupplierDebtPaymentFormInput,
} from "@/server/validations/purchase";

export class PurchaseServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseServiceError";
  }
}

const MONEY_MAX = new Prisma.Decimal("999999999999.99");
const QUANTITY_MAX = new Prisma.Decimal("99999999999.999");
const ALLOWED_PURCHASE_PAYMENT_TYPES = ["CASH", "QRIS", "TRANSFER"] as const;

function asDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function assertDecimalFits(
  value: Prisma.Decimal,
  maximum: Prisma.Decimal,
  maximumScale: number,
  message: string,
) {
  if (value.abs().greaterThan(maximum) || value.decimalPlaces() > maximumScale) {
    throw new PurchaseServiceError(message);
  }
}

function isRetryableTransactionError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return error.code === "P2002" || error.code === "P2034";
}

export async function listPurchaseFormOptions() {
  await requireOwner();

  const [products, paymentMethods] = await Promise.all([
    db.product.findMany({
      where: { isActive: true, units: { some: { isActive: true } } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        productCode: true,
        name: true,
        baseUnitName: true,
        units: {
          where: { isActive: true },
          orderBy: [{ isBaseUnit: "desc" }, { unitName: "asc" }],
          select: { id: true, unitName: true, conversionToBase: true },
        },
      },
    }),
    db.paymentMethod.findMany({
      where: { isActive: true, type: { in: [...ALLOWED_PURCHASE_PAYMENT_TYPES] } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    }),
  ]);

  return {
    products: products.map((product) => ({
      ...product,
      units: product.units.map((unit) => ({
        ...unit,
        conversionToBase: unit.conversionToBase.toString(),
      })),
    })),
    paymentMethods,
  };
}

type PurchaseListFilters = {
  supplierName?: string;
};

export async function listPurchases(filters: PurchaseListFilters = {}) {
  await requireOwner();
  const supplierName = filters.supplierName?.trim();

  return db.purchase.findMany({
    where: supplierName ? { supplierName } : undefined,
    orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      purchaseNumber: true,
      supplierName: true,
      supplierInvoiceNumber: true,
      purchaseDate: true,
      grandTotal: true,
      amountPaid: true,
      remainingDebt: true,
      paymentStatus: true,
      status: true,
      supplier: { select: { supplierCode: true, name: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function listPurchaseSupplierFilters() {
  await requireOwner();

  const suppliers = await db.purchase.findMany({
    distinct: ["supplierName"],
    where: { supplierName: { not: "" } },
    orderBy: { supplierName: "asc" },
    select: { supplierName: true },
  });

  return suppliers.map((supplier) => supplier.supplierName);
}

export async function getPurchaseReceiptData(id: string) {
  await requireOwner();

  const [purchase, paymentMethods] = await Promise.all([
    db.purchase.findUnique({
      where: { id },
      select: {
        id: true,
        purchaseNumber: true,
        supplierName: true,
        purchaseDate: true,
        dueDate: true,
        grandTotal: true,
        status: true,
        payments: {
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
          select: {
            paymentNumber: true,
            paymentDate: true,
            amount: true,
            referenceNumber: true,
            receiptUrl: true,
            paymentMethod: { select: { name: true, type: true } },
          },
        },
        supplier: { select: { supplierCode: true, name: true } },
        items: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            quantity: true,
            unitCost: true,
            subtotal: true,
            product: { select: { productCode: true, name: true } },
            productUnit: { select: { unitName: true } },
          },
        },
      },
    }),
    db.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    }),
  ]);

  return { purchase, paymentMethods };
}

export async function getPurchaseDetail(id: string) {
  await requireOwner();

  return db.purchase.findUnique({
    where: { id },
    select: {
      id: true,
      purchaseNumber: true,
      supplierName: true,
      supplierInvoiceNumber: true,
      purchaseDate: true,
      dueDate: true,
      subtotal: true,
      discountAmount: true,
      shippingCost: true,
      otherCost: true,
      grandTotal: true,
      amountPaid: true,
      remainingDebt: true,
      paymentStatus: true,
      status: true,
      notes: true,
      supplier: { select: { supplierCode: true, name: true } },
      items: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          quantity: true,
          baseQuantity: true,
          unitCost: true,
          baseUnitCost: true,
          discountAmount: true,
          subtotal: true,
          expiryDate: true,
          product: { select: { productCode: true, name: true, baseUnitName: true } },
          productUnit: { select: { unitName: true } },
          inventoryBatches: {
            select: {
              id: true,
              batchNumber: true,
              remainingQuantity: true,
              status: true,
            },
          },
        },
      },
      payments: {
        orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          amount: true,
          referenceNumber: true,
          receiptUrl: true,
          paymentMethod: { select: { name: true, type: true } },
        },
      },
      returns: {
        orderBy: [{ returnDate: "desc" }, { createdAt: "desc" }],
        select: {
          returnNumber: true,
          returnDate: true,
          reason: true,
          refundMethod: true,
          totalAmount: true,
          status: true,
        },
      },
    },
  });
}

export async function createDraftPurchase(input: PurchaseDraftFormInput & { supplierId: string }) {
  const owner = await requireOwner();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const supplier = await transaction.supplier.findFirst({
            where: { id: input.supplierId, isActive: true },
            select: { id: true, name: true },
          });

          if (!supplier) {
            throw new PurchaseServiceError("Supplier aktif tidak ditemukan.");
          }

          const requestedUnitIds = [...new Set(input.items.map((item) => item.productUnitId))];
          const units = await transaction.productUnit.findMany({
            where: {
              id: { in: requestedUnitIds },
              isActive: true,
              product: { isActive: true },
            },
            select: {
              id: true,
              productId: true,
              conversionToBase: true,
              product: { select: { name: true } },
            },
          });

          if (units.length !== requestedUnitIds.length) {
            throw new PurchaseServiceError("Salah satu Produk atau Satuan tidak aktif/tidak ditemukan.");
          }

          const unitById = new Map(units.map((unit) => [unit.id, unit]));
          const purchaseItems = input.items.map((item, index) => {
            const unit = unitById.get(item.productUnitId);

            if (!unit) {
              throw new PurchaseServiceError(`Satuan pada item ${index + 1} tidak ditemukan.`);
            }

            const quantity = new Prisma.Decimal(item.quantity);
            const unitCost = new Prisma.Decimal(item.unitCost);
            const itemDiscount = new Prisma.Decimal(item.discountAmount);
            const baseQuantity = quantity.mul(unit.conversionToBase);
            const grossSubtotal = quantity.mul(unitCost);
            const subtotal = grossSubtotal.sub(itemDiscount);
            const baseUnitCost = unitCost.div(unit.conversionToBase);

            if (itemDiscount.greaterThan(grossSubtotal)) {
              throw new PurchaseServiceError(
                `Diskon item ${index + 1} tidak boleh melebihi nilai belinya.`,
              );
            }

            assertDecimalFits(
              baseQuantity,
              QUANTITY_MAX,
              3,
              `Jumlah dasar item ${index + 1} tidak sesuai presisi database.`,
            );
            assertDecimalFits(
              subtotal,
              MONEY_MAX,
              2,
              `Subtotal item ${index + 1} tidak sesuai presisi uang.`,
            );
            assertDecimalFits(
              baseUnitCost,
              MONEY_MAX,
              2,
              `Harga modal satuan dasar item ${index + 1} menghasilkan lebih dari 2 desimal.`,
            );

            return {
              productId: unit.productId,
              productUnitId: unit.id,
              quantity,
              conversionToBase: unit.conversionToBase,
              baseQuantity,
              unitCost,
              baseUnitCost,
              discountAmount: itemDiscount,
              subtotal,
              expiryDate: item.expiryDate ? asDate(item.expiryDate) : null,
            };
          });

          const subtotal = purchaseItems.reduce(
            (total, item) => total.add(item.subtotal),
            new Prisma.Decimal(0),
          );
          const discountAmount = new Prisma.Decimal(input.discountAmount);
          const shippingCost = new Prisma.Decimal(input.shippingCost);
          const otherCost = new Prisma.Decimal(input.otherCost);
          const grandTotal = subtotal.sub(discountAmount).add(shippingCost).add(otherCost);

          if (grandTotal.lessThanOrEqualTo(0)) {
            throw new PurchaseServiceError("Total pembelian harus lebih besar dari 0.");
          }

          assertDecimalFits(grandTotal, MONEY_MAX, 2, "Total pembelian melebihi batas database.");

          const prefix = getPurchaseNumberPrefix(input.purchaseDate);
          const existing = await transaction.purchase.findMany({
            where: { purchaseNumber: { startsWith: prefix } },
            select: { purchaseNumber: true },
          });
          const purchaseNumber = getNextPurchaseNumber(
            existing.map((purchase) => purchase.purchaseNumber),
            input.purchaseDate,
          );

          return transaction.purchase.create({
            data: {
              purchaseNumber,
              supplierId: input.supplierId,
              supplierName: supplier.name,
              supplierInvoiceNumber: input.supplierInvoiceNumber || null,
              purchaseDate: asDate(input.purchaseDate),
              dueDate: input.dueDate ? asDate(input.dueDate) : null,
              subtotal,
              discountAmount,
              shippingCost,
              otherCost,
              grandTotal,
              amountPaid: 0,
              remainingDebt: 0,
              paymentStatus: "UNPAID",
              status: "DRAFT",
              notes: input.notes || null,
              createdBy: owner.id,
              items: { create: purchaseItems },
            },
            select: { id: true, purchaseNumber: true },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new PurchaseServiceError("Nomor pembelian belum dapat dibuat.");
}

export async function createPurchase(
  input: PurchaseDraftFormInput & { receiptUrl?: string | null },
) {
  const owner = await requireOwner();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const normalizedSupplierName = input.supplierName.trim();
          let supplier = await transaction.supplier.findFirst({
            where: {
              name: { equals: normalizedSupplierName, mode: "insensitive" },
            },
            select: { id: true },
          });

          if (!supplier) {
            const suppliers = await transaction.supplier.findMany({
              where: { supplierCode: { startsWith: "SUP-" } },
              select: { supplierCode: true },
            });
            supplier = await transaction.supplier.create({
              data: {
                supplierCode: getNextSupplierCode(
                  suppliers.map((existing) => existing.supplierCode),
                ),
                name: normalizedSupplierName,
                isActive: true,
              },
              select: { id: true },
            });
          }

          const requestedUnitIds = [...new Set(input.items.map((item) => item.productUnitId))];
          const units = await transaction.productUnit.findMany({
            where: {
              id: { in: requestedUnitIds },
              isActive: true,
              product: { isActive: true },
            },
            select: {
              id: true,
              productId: true,
              conversionToBase: true,
              product: { select: { name: true, currentStock: true } },
            },
          });

          if (units.length !== requestedUnitIds.length) {
            throw new PurchaseServiceError("Salah satu Produk atau Satuan tidak aktif/tidak ditemukan.");
          }

          const unitById = new Map(units.map((unit) => [unit.id, unit]));
          const purchaseItems = input.items.map((item, index) => {
            const unit = unitById.get(item.productUnitId);
            if (!unit) throw new PurchaseServiceError(`Satuan pada item ${index + 1} tidak ditemukan.`);

            const quantity = new Prisma.Decimal(item.quantity);
            const unitCost = new Prisma.Decimal(item.unitCost);
            const itemDiscount = new Prisma.Decimal(item.discountAmount);
            const baseQuantity = quantity.mul(unit.conversionToBase);
            const grossSubtotal = quantity.mul(unitCost);
            const subtotal = grossSubtotal.sub(itemDiscount);
            const baseUnitCost = unitCost.div(unit.conversionToBase);

            if (itemDiscount.greaterThan(grossSubtotal)) {
              throw new PurchaseServiceError(`Diskon item ${index + 1} tidak boleh melebihi nilai belinya.`);
            }

            assertDecimalFits(baseQuantity, QUANTITY_MAX, 3, `Jumlah dasar item ${index + 1} tidak sesuai presisi database.`);
            assertDecimalFits(subtotal, MONEY_MAX, 2, `Subtotal item ${index + 1} tidak sesuai presisi uang.`);
            assertDecimalFits(baseUnitCost, MONEY_MAX, 2, `Harga modal satuan dasar item ${index + 1} menghasilkan lebih dari 2 desimal.`);

            return {
              productId: unit.productId,
              productUnitId: unit.id,
              quantity,
              conversionToBase: unit.conversionToBase,
              baseQuantity,
              unitCost,
              baseUnitCost,
              discountAmount: itemDiscount,
              subtotal,
              expiryDate: item.expiryDate ? asDate(item.expiryDate) : null,
            };
          });

          const subtotal = purchaseItems.reduce(
            (total, item) => total.add(item.subtotal),
            new Prisma.Decimal(0),
          );
          const discountAmount = new Prisma.Decimal(input.discountAmount);
          const shippingCost = new Prisma.Decimal(input.shippingCost);
          const otherCost = new Prisma.Decimal(input.otherCost);
          const grandTotal = subtotal.sub(discountAmount).add(shippingCost).add(otherCost);

          if (grandTotal.lessThanOrEqualTo(0)) {
            throw new PurchaseServiceError("Total pembelian harus lebih besar dari 0.");
          }
          if (discountAmount.greaterThan(subtotal)) {
            throw new PurchaseServiceError("Diskon transaksi tidak boleh melebihi subtotal item.");
          }

          const requestedAmountPaid =
            input.paymentMode === "PAID"
              ? grandTotal
              : new Prisma.Decimal(input.amountPaid);
          if (requestedAmountPaid.greaterThan(grandTotal)) {
            throw new PurchaseServiceError("Jumlah pembayaran tidak boleh melebihi total pembelian.");
          }

          const remainingDebt = grandTotal.sub(requestedAmountPaid);
          const paymentStatus =
            remainingDebt.isZero() ? "PAID" : requestedAmountPaid.greaterThan(0) ? "PARTIAL" : "UNPAID";
          const dueDate = paymentStatus === "PAID" ? null : input.dueDate ? asDate(input.dueDate) : null;

          if (paymentStatus !== "PAID" && !dueDate) {
            throw new PurchaseServiceError("Tanggal jatuh tempo wajib diisi untuk hutang.");
          }

          let paymentMethod: { id: string } | null = null;
          if (requestedAmountPaid.greaterThan(0)) {
            paymentMethod = input.paymentMethodId
              ? await transaction.paymentMethod.findFirst({
                  where: {
                    id: input.paymentMethodId,
                    isActive: true,
                    type: { in: [...ALLOWED_PURCHASE_PAYMENT_TYPES] },
                  },
                  select: { id: true },
                })
              : null;
            if (!paymentMethod) {
              throw new PurchaseServiceError("Metode pembayaran CASH/QRIS/TRANSFER tidak ditemukan.");
            }
          }

          const prefix = getPurchaseNumberPrefix(input.purchaseDate);
          const existingPurchases = await transaction.purchase.findMany({
            where: { purchaseNumber: { startsWith: prefix } },
            select: { purchaseNumber: true },
          });
          const purchaseNumber =
            input.purchaseNumberMode === "MANUAL" && input.customPurchaseNumber
              ? input.customPurchaseNumber
              : getNextPurchaseNumber(
                  existingPurchases.map((purchase) => purchase.purchaseNumber),
                  input.purchaseDate,
                );

          const duplicate = await transaction.purchase.findUnique({
            where: { purchaseNumber },
            select: { id: true },
          });
          if (duplicate) {
            throw new PurchaseServiceError("Nomor pembelian sudah digunakan.");
          }

          const purchase = await transaction.purchase.create({
            data: {
              purchaseNumber,
              supplierId: supplier.id,
              supplierName: input.supplierName,
              supplierInvoiceNumber: input.supplierInvoiceNumber || null,
              purchaseDate: asDate(input.purchaseDate),
              dueDate,
              subtotal,
              discountAmount,
              shippingCost,
              otherCost,
              grandTotal,
              amountPaid: requestedAmountPaid,
              remainingDebt,
              paymentStatus,
              status: "RECEIVED",
              notes: input.notes || null,
              createdBy: owner.id,
              items: { create: purchaseItems },
            },
            select: {
              id: true,
              purchaseNumber: true,
              purchaseDate: true,
              supplierId: true,
              items: {
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                select: {
                  id: true,
                  productId: true,
                  baseQuantity: true,
                  baseUnitCost: true,
                  expiryDate: true,
                },
              },
            },
          });

          const productIds = [...new Set(purchase.items.map((item) => item.productId))];
          const products = await transaction.product.findMany({
            where: { id: { in: productIds }, isActive: true },
            select: { id: true, name: true, currentStock: true },
          });
          const productById = new Map(products.map((product) => [product.id, product]));

          const dateKey = input.purchaseDate.replaceAll("-", "");
          const batchPrefix = getDatedNumberPrefix("BAT", dateKey);
          const movementPrefix = getDatedNumberPrefix("STK", dateKey);
          const paymentPrefix = getDatedNumberPrefix("PAY", dateKey);
          const [batchNumbers, movementNumbers, paymentNumbers] = await Promise.all([
            transaction.inventoryBatch.findMany({
              where: { batchNumber: { startsWith: batchPrefix } },
              select: { batchNumber: true },
            }),
            transaction.stockMovement.findMany({
              where: { movementNumber: { startsWith: movementPrefix } },
              select: { movementNumber: true },
            }),
            requestedAmountPaid.greaterThan(0)
              ? transaction.purchasePayment.findMany({
                  where: { paymentNumber: { startsWith: paymentPrefix } },
                  select: { paymentNumber: true },
                })
              : Promise.resolve([]),
          ]);
          let nextBatchSequence = getNextDatedSequence(batchNumbers.map((batch) => batch.batchNumber), "BAT", dateKey);
          let nextMovementSequence = getNextDatedSequence(movementNumbers.map((movement) => movement.movementNumber), "STK", dateKey);
          const nextPaymentSequence = getNextDatedSequence(paymentNumbers.map((payment) => payment.paymentNumber), "PAY", dateKey);

          for (const item of purchase.items) {
            const product = productById.get(item.productId);
            if (!product) throw new PurchaseServiceError("Produk pembelian tidak ditemukan.");

            const stockBefore = product.currentStock;
            const stockAfter = stockBefore.add(item.baseQuantity);
            assertDecimalFits(stockAfter, QUANTITY_MAX, 3, `Stok ${product.name} melebihi batas database.`);

            const batch = await transaction.inventoryBatch.create({
              data: {
                batchNumber: formatDatedNumber("BAT", dateKey, nextBatchSequence),
                productId: item.productId,
                purchaseItemId: item.id,
                supplierId: purchase.supplierId,
                receivedDate: purchase.purchaseDate,
                expiryDate: item.expiryDate,
                initialQuantity: item.baseQuantity,
                remainingQuantity: item.baseQuantity,
                baseUnitCost: item.baseUnitCost,
                status: "ACTIVE",
              },
              select: { id: true },
            });
            nextBatchSequence += 1;

            await transaction.product.update({
              where: { id: item.productId },
              data: { currentStock: stockAfter },
            });
            await transaction.stockMovement.create({
              data: {
                movementNumber: formatDatedNumber("STK", dateKey, nextMovementSequence),
                productId: item.productId,
                inventoryBatchId: batch.id,
                movementType: "PURCHASE",
                quantityIn: item.baseQuantity,
                quantityOut: 0,
                stockBefore,
                stockAfter,
                referenceType: "PURCHASE",
                referenceId: purchase.id,
                description: `Pembelian ${purchase.purchaseNumber}`,
                createdBy: owner.id,
              },
            });
            nextMovementSequence += 1;
            product.currentStock = stockAfter;
          }

          if (requestedAmountPaid.greaterThan(0) && paymentMethod) {
            await transaction.purchasePayment.create({
              data: {
                paymentNumber: formatDatedNumber("PAY", dateKey, nextPaymentSequence),
                purchaseId: purchase.id,
                paymentMethodId: paymentMethod.id,
                paymentDate: asDate(input.purchaseDate),
                amount: requestedAmountPaid,
                referenceNumber: input.referenceNumber || null,
                receiptUrl: input.receiptUrl || null,
                notes: input.paymentNotes || null,
                createdBy: owner.id,
              },
            });
          }

          return {
            purchaseNumber: purchase.purchaseNumber,
            batchCount: purchase.items.length,
            paymentStatus,
          };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }

  throw new PurchaseServiceError("Pembelian belum dapat disimpan.");
}

export async function receivePurchase(id: string, input: PurchaseReceiptFormInput) {
  const owner = await requireOwner();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const purchase = await transaction.purchase.findUnique({
            where: { id },
            select: {
              id: true,
              purchaseNumber: true,
              purchaseDate: true,
              dueDate: true,
              supplierId: true,
              grandTotal: true,
              status: true,
              items: {
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                select: {
                  id: true,
                  productId: true,
                  baseQuantity: true,
                  baseUnitCost: true,
                  expiryDate: true,
                },
              },
            },
          });

          if (!purchase) throw new PurchaseServiceError("Pembelian tidak ditemukan.");
          if (purchase.status !== "DRAFT") {
            throw new PurchaseServiceError("Hanya pembelian berstatus DRAFT yang dapat diterima.");
          }
          if (!purchase.items.length) {
            throw new PurchaseServiceError("Pembelian belum memiliki item.");
          }

          const amountPaid = new Prisma.Decimal(input.amountPaid);
          if (amountPaid.greaterThan(purchase.grandTotal)) {
            throw new PurchaseServiceError("Jumlah pembayaran tidak boleh melebihi total pembelian.");
          }
          if (input.paymentStatus === "UNPAID" && !amountPaid.isZero()) {
            throw new PurchaseServiceError("Status UNPAID harus memiliki pembayaran 0.");
          }
          if (
            input.paymentStatus === "PARTIAL" &&
            (amountPaid.lessThanOrEqualTo(0) || amountPaid.greaterThanOrEqualTo(purchase.grandTotal))
          ) {
            throw new PurchaseServiceError(
              "Status PARTIAL membutuhkan pembayaran lebih dari 0 dan kurang dari total.",
            );
          }
          if (input.paymentStatus === "PAID" && !amountPaid.equals(purchase.grandTotal)) {
            throw new PurchaseServiceError("Status PAID harus dibayar tepat sebesar total pembelian.");
          }
          if (
            input.dueDate &&
            asDate(input.dueDate).getTime() < purchase.purchaseDate.getTime()
          ) {
            throw new PurchaseServiceError(
              "Jatuh tempo tidak boleh sebelum tanggal pembelian.",
            );
          }

          const remainingDebt = purchase.grandTotal.sub(amountPaid);
          let paymentMethod: { id: string } | null = null;
          if (amountPaid.greaterThan(0)) {
            paymentMethod = input.paymentMethodId
              ? await transaction.paymentMethod.findFirst({
                  where: { id: input.paymentMethodId, isActive: true },
                  select: { id: true },
                })
              : null;
            if (!paymentMethod) {
              throw new PurchaseServiceError("Metode pembayaran aktif tidak ditemukan.");
            }
          }

          const itemIds = purchase.items.map((item) => item.id);
          const existingBatch = await transaction.inventoryBatch.findFirst({
            where: { purchaseItemId: { in: itemIds } },
            select: { id: true },
          });
          if (existingBatch) {
            throw new PurchaseServiceError("Batch untuk pembelian ini sudah pernah dibuat.");
          }

          const productIds = [...new Set(purchase.items.map((item) => item.productId))];
          const products = await transaction.product.findMany({
            where: { id: { in: productIds }, isActive: true },
            select: { id: true, name: true, currentStock: true },
          });
          if (products.length !== productIds.length) {
            throw new PurchaseServiceError("Salah satu Produk pembelian tidak aktif atau tidak ditemukan.");
          }

          const dateKey = purchase.purchaseDate.toISOString().slice(0, 10).replaceAll("-", "");
          const batchPrefix = getDatedNumberPrefix("BAT", dateKey);
          const movementPrefix = getDatedNumberPrefix("STK", dateKey);
          const paymentPrefix = getDatedNumberPrefix("PAY", dateKey);
          const [batchNumbers, movementNumbers, paymentNumbers] = await Promise.all([
            transaction.inventoryBatch.findMany({
              where: { batchNumber: { startsWith: batchPrefix } },
              select: { batchNumber: true },
            }),
            transaction.stockMovement.findMany({
              where: { movementNumber: { startsWith: movementPrefix } },
              select: { movementNumber: true },
            }),
            amountPaid.greaterThan(0)
              ? transaction.purchasePayment.findMany({
                  where: { paymentNumber: { startsWith: paymentPrefix } },
                  select: { paymentNumber: true },
                })
              : Promise.resolve([]),
          ]);
          let nextBatchSequence = getNextDatedSequence(
            batchNumbers.map((batch) => batch.batchNumber),
            "BAT",
            dateKey,
          );
          let nextMovementSequence = getNextDatedSequence(
            movementNumbers.map((movement) => movement.movementNumber),
            "STK",
            dateKey,
          );
          const nextPaymentSequence = getNextDatedSequence(
            paymentNumbers.map((payment) => payment.paymentNumber),
            "PAY",
            dateKey,
          );
          const productById = new Map(
            products.map((product) => [product.id, { ...product, currentStock: product.currentStock }]),
          );

          for (const item of purchase.items) {
            const product = productById.get(item.productId);
            if (!product) throw new PurchaseServiceError("Produk pembelian tidak ditemukan.");

            const stockBefore = product.currentStock;
            const stockAfter = stockBefore.add(item.baseQuantity);
            assertDecimalFits(
              stockAfter,
              QUANTITY_MAX,
              3,
              `Stok ${product.name} melebihi batas database.`,
            );

            const batch = await transaction.inventoryBatch.create({
              data: {
                batchNumber: formatDatedNumber("BAT", dateKey, nextBatchSequence),
                productId: item.productId,
                purchaseItemId: item.id,
                supplierId: purchase.supplierId,
                receivedDate: purchase.purchaseDate,
                expiryDate: item.expiryDate,
                initialQuantity: item.baseQuantity,
                remainingQuantity: item.baseQuantity,
                baseUnitCost: item.baseUnitCost,
                status: "ACTIVE",
              },
              select: { id: true },
            });
            nextBatchSequence += 1;

            const updated = await transaction.product.updateMany({
              where: { id: item.productId, currentStock: stockBefore },
              data: { currentStock: stockAfter },
            });
            if (updated.count !== 1) {
              throw new PurchaseServiceError("Stok berubah bersamaan. Silakan ulangi penerimaan.");
            }

            await transaction.stockMovement.create({
              data: {
                movementNumber: formatDatedNumber("STK", dateKey, nextMovementSequence),
                productId: item.productId,
                inventoryBatchId: batch.id,
                movementType: "PURCHASE",
                quantityIn: item.baseQuantity,
                quantityOut: 0,
                stockBefore,
                stockAfter,
                referenceType: "PURCHASE",
                referenceId: purchase.id,
                description: `Penerimaan ${purchase.purchaseNumber}`,
                createdBy: owner.id,
              },
            });
            nextMovementSequence += 1;
            product.currentStock = stockAfter;
          }

          const received = await transaction.purchase.updateMany({
            where: { id: purchase.id, status: "DRAFT" },
            data: {
              status: "RECEIVED",
              dueDate: input.dueDate ? asDate(input.dueDate) : null,
              amountPaid,
              remainingDebt,
              paymentStatus: input.paymentStatus,
            },
          });
          if (received.count !== 1) {
            throw new PurchaseServiceError("Status pembelian berubah. Silakan muat ulang halaman.");
          }

          if (amountPaid.greaterThan(0) && paymentMethod) {
            await transaction.purchasePayment.create({
              data: {
                paymentNumber: formatDatedNumber("PAY", dateKey, nextPaymentSequence),
                purchaseId: purchase.id,
                paymentMethodId: paymentMethod.id,
                paymentDate: purchase.purchaseDate,
                amount: amountPaid,
                referenceNumber: input.referenceNumber || null,
                notes: input.paymentNotes || null,
                createdBy: owner.id,
              },
            });
          }

          return {
            purchaseNumber: purchase.purchaseNumber,
            batchCount: purchase.items.length,
            paymentStatus: input.paymentStatus,
          };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }

  throw new PurchaseServiceError("Pembelian belum dapat diterima.");
}

export async function listSupplierDebts() {
  await requireOwner();

  return db.purchase.findMany({
    where: { status: "RECEIVED", remainingDebt: { gt: 0 } },
    orderBy: [{ dueDate: "asc" }, { purchaseDate: "asc" }],
    select: {
      id: true,
      purchaseNumber: true,
      purchaseDate: true,
      dueDate: true,
      grandTotal: true,
      amountPaid: true,
      remainingDebt: true,
      paymentStatus: true,
      supplier: { select: { supplierCode: true, name: true } },
    },
  });
}

export async function listSupplierPaymentHistory() {
  await requireOwner();

  return db.purchasePayment.findMany({
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      paymentNumber: true,
      paymentDate: true,
      amount: true,
      referenceNumber: true,
      purchase: {
        select: {
          purchaseNumber: true,
          supplier: { select: { supplierCode: true, name: true } },
        },
      },
      paymentMethod: { select: { code: true, name: true } },
      creator: { select: { name: true } },
    },
  });
}

export async function getSupplierDebtPaymentData(id: string) {
  await requireOwner();

  const [purchase, paymentMethods] = await Promise.all([
    db.purchase.findUnique({
      where: { id },
      select: {
        id: true,
        purchaseNumber: true,
        purchaseDate: true,
        dueDate: true,
        grandTotal: true,
        amountPaid: true,
        remainingDebt: true,
        paymentStatus: true,
        status: true,
        supplier: { select: { supplierCode: true, name: true } },
        payments: {
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            paymentNumber: true,
            paymentDate: true,
            amount: true,
            paymentMethod: { select: { name: true } },
          },
        },
      },
    }),
    db.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    }),
  ]);

  return { purchase, paymentMethods };
}

export async function paySupplierDebt(id: string, input: SupplierDebtPaymentFormInput) {
  const owner = await requireOwner();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const purchase = await transaction.purchase.findUnique({
            where: { id },
            select: {
              id: true,
              purchaseNumber: true,
              purchaseDate: true,
              status: true,
              paymentStatus: true,
              amountPaid: true,
              remainingDebt: true,
            },
          });

          if (!purchase || purchase.status !== "RECEIVED") {
            throw new PurchaseServiceError("Pembelian diterima tidak ditemukan.");
          }
          if (purchase.paymentStatus === "PAID" || purchase.remainingDebt.lessThanOrEqualTo(0)) {
            throw new PurchaseServiceError("Hutang pembelian ini sudah lunas.");
          }

          const paymentDate = asDate(input.paymentDate);
          if (paymentDate.getTime() < purchase.purchaseDate.getTime()) {
            throw new PurchaseServiceError(
              "Tanggal pembayaran tidak boleh sebelum tanggal pembelian.",
            );
          }

          const paymentMethod = await transaction.paymentMethod.findFirst({
            where: { id: input.paymentMethodId, isActive: true },
            select: { id: true },
          });
          if (!paymentMethod) {
            throw new PurchaseServiceError("Metode pembayaran aktif tidak ditemukan.");
          }

          const calculation = calculateSupplierDebtPayment(
            purchase.amountPaid,
            purchase.remainingDebt,
            new Prisma.Decimal(input.amount),
          );
          if (!calculation.success) {
            throw new PurchaseServiceError(calculation.error);
          }

          const dateKey = input.paymentDate.replaceAll("-", "");
          const paymentPrefix = getDatedNumberPrefix("PAY", dateKey);
          const paymentNumbers = await transaction.purchasePayment.findMany({
            where: { paymentNumber: { startsWith: paymentPrefix } },
            select: { paymentNumber: true },
          });
          const paymentNumber = formatDatedNumber(
            "PAY",
            dateKey,
            getNextDatedSequence(
              paymentNumbers.map((payment) => payment.paymentNumber),
              "PAY",
              dateKey,
            ),
          );

          await transaction.purchasePayment.create({
            data: {
              paymentNumber,
              purchaseId: purchase.id,
              paymentMethodId: paymentMethod.id,
              paymentDate,
              amount: input.amount,
              referenceNumber: input.referenceNumber || null,
              receiptUrl: input.receiptUrl || null,
              notes: input.notes || null,
              createdBy: owner.id,
            },
          });

          const updated = await transaction.purchase.updateMany({
            where: {
              id: purchase.id,
              status: "RECEIVED",
              remainingDebt: purchase.remainingDebt,
              paymentStatus: { in: ["UNPAID", "PARTIAL"] },
            },
            data: {
              amountPaid: calculation.amountPaid,
              remainingDebt: calculation.remainingDebt,
              paymentStatus: calculation.paymentStatus,
            },
          });
          if (updated.count !== 1) {
            throw new PurchaseServiceError(
              "Sisa hutang berubah bersamaan. Silakan muat ulang dan ulangi pembayaran.",
            );
          }

          return {
            purchaseNumber: purchase.purchaseNumber,
            paymentNumber,
            paymentStatus: calculation.paymentStatus,
            remainingDebt: calculation.remainingDebt.toString(),
          };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }

  throw new PurchaseServiceError("Pembayaran hutang belum dapat disimpan.");
}

export async function getPurchaseReturnData(id: string) {
  await requireOwner();

  const purchase = await db.purchase.findUnique({
    where: { id },
    select: {
      id: true,
      purchaseNumber: true,
      supplierName: true,
      remainingDebt: true,
      paymentStatus: true,
      status: true,
      items: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          productId: true,
          product: { select: { name: true, baseUnitName: true } },
          baseQuantity: true,
          baseUnitCost: true,
          inventoryBatches: {
            select: {
              id: true,
              batchNumber: true,
              remainingQuantity: true,
            },
          },
        },
      },
    },
  });

  return purchase;
}

export async function createPurchaseReturn(id: string, input: PurchaseReturnFormInput) {
  const owner = await requireOwner();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const purchase = await transaction.purchase.findUnique({
            where: { id },
            select: {
              id: true,
              purchaseNumber: true,
              supplierId: true,
              status: true,
              remainingDebt: true,
              amountPaid: true,
              paymentStatus: true,
              items: {
                select: {
                  id: true,
                  productId: true,
                  baseUnitCost: true,
                  inventoryBatches: {
                    select: {
                      id: true,
                      remainingQuantity: true,
                    },
                  },
                  returnItems: {
                    where: { purchaseReturn: { status: "COMPLETED" } },
                    select: { quantity: true },
                  },
                },
              },
            },
          });

          if (!purchase || purchase.status !== "RECEIVED") {
            throw new PurchaseServiceError("Pembelian diterima tidak ditemukan.");
          }

          const itemById = new Map(purchase.items.map((item) => [item.id, item]));
          const requestedItems = input.items.map((item) => {
            const purchaseItem = itemById.get(item.purchaseItemId);
            if (!purchaseItem) throw new PurchaseServiceError("Item retur tidak sesuai pembelian.");

            const batch = purchaseItem.inventoryBatches.find(
              (candidate) => candidate.id === item.inventoryBatchId,
            );
            if (!batch) throw new PurchaseServiceError("Batch retur tidak sesuai item pembelian.");

            const quantity = new Prisma.Decimal(item.quantity);
            if (quantity.greaterThan(batch.remainingQuantity)) {
              throw new PurchaseServiceError("Jumlah retur melebihi sisa stok batch.");
            }

            return { purchaseItem, batch, quantity };
          });

          const dateKey = getJakartaDateKey();
          const returnPrefix = getDatedNumberPrefix("PRT", dateKey);
          const movementPrefix = getDatedNumberPrefix("STK", dateKey);
          const [returnNumbers, movementNumbers] = await Promise.all([
            transaction.purchaseReturn.findMany({
              where: { returnNumber: { startsWith: returnPrefix } },
              select: { returnNumber: true },
            }),
            transaction.stockMovement.findMany({
              where: { movementNumber: { startsWith: movementPrefix } },
              select: { movementNumber: true },
            }),
          ]);
          const returnNumber = formatDatedNumber(
            "PRT",
            dateKey,
            getNextDatedSequence(
              returnNumbers.map((purchaseReturn) => purchaseReturn.returnNumber),
              "PRT",
              dateKey,
            ),
          );
          let nextMovementSequence = getNextDatedSequence(
            movementNumbers.map((movement) => movement.movementNumber),
            "STK",
            dateKey,
          );

          const returnItems = requestedItems.map(({ purchaseItem, batch, quantity }) => ({
            purchaseItemId: purchaseItem.id,
            inventoryBatchId: batch.id,
            productId: purchaseItem.productId,
            quantity,
            unitCost: purchaseItem.baseUnitCost,
            subtotal: quantity.mul(purchaseItem.baseUnitCost),
          }));
          const totalAmount = returnItems.reduce(
            (total, item) => total.add(item.subtotal),
            new Prisma.Decimal(0),
          );

          const purchaseReturn = await transaction.purchaseReturn.create({
            data: {
              returnNumber,
              purchaseId: purchase.id,
              supplierId: purchase.supplierId,
              returnDate: new Date(),
              reason: input.reason,
              totalAmount,
              refundMethod: input.refundMethod,
              status: "COMPLETED",
              notes: input.notes || null,
              createdBy: owner.id,
              items: { create: returnItems },
            },
            select: { id: true },
          });

          const productIds = [...new Set(requestedItems.map((item) => item.purchaseItem.productId))];
          const products = await transaction.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, currentStock: true },
          });
          const productStockById = new Map(
            products.map((product) => [product.id, product.currentStock]),
          );

          for (const { purchaseItem, batch, quantity } of requestedItems) {
            const stockBefore = productStockById.get(purchaseItem.productId);
            if (!stockBefore) throw new PurchaseServiceError("Produk retur tidak ditemukan.");
            const stockAfter = stockBefore.sub(quantity);
            if (stockAfter.lessThan(0)) {
              throw new PurchaseServiceError("Retur pembelian membuat stok produk negatif.");
            }

            await transaction.inventoryBatch.update({
              where: { id: batch.id },
              data: {
                remainingQuantity: { decrement: quantity },
                status: batch.remainingQuantity.equals(quantity) ? "DEPLETED" : "ACTIVE",
              },
            });
            await transaction.product.update({
              where: { id: purchaseItem.productId },
              data: { currentStock: stockAfter },
            });
            await transaction.stockMovement.create({
              data: {
                movementNumber: formatDatedNumber("STK", dateKey, nextMovementSequence),
                productId: purchaseItem.productId,
                inventoryBatchId: batch.id,
                movementType: "PURCHASE_RETURN",
                quantityIn: 0,
                quantityOut: quantity,
                stockBefore,
                stockAfter,
                referenceType: "PURCHASE_RETURN",
                referenceId: purchaseReturn.id,
                description: `Retur pembelian ${purchase.purchaseNumber} / ${returnNumber}`,
                createdBy: owner.id,
              },
            });
            nextMovementSequence += 1;
            productStockById.set(purchaseItem.productId, stockAfter);
          }

          if (input.refundMethod === "DEDUCT_FROM_DEBT") {
            const nextRemainingDebt = Prisma.Decimal.max(
              new Prisma.Decimal(0),
              purchase.remainingDebt.sub(totalAmount),
            );
            const nextAmountPaid = purchase.amountPaid;
            const nextPaymentStatus = nextRemainingDebt.isZero()
              ? "PAID"
              : nextAmountPaid.greaterThan(0)
                ? "PARTIAL"
                : "UNPAID";

            await transaction.purchase.update({
              where: { id: purchase.id },
              data: {
                remainingDebt: nextRemainingDebt,
                paymentStatus: nextPaymentStatus,
                status: "RETURNED",
              },
            });
          } else {
            await transaction.purchase.update({
              where: { id: purchase.id },
              data: { status: "RETURNED" },
            });
          }

          return { purchaseNumber: purchase.purchaseNumber, returnNumber };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }

  throw new PurchaseServiceError("Retur pembelian belum dapat disimpan.");
}

function getJakartaDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).replaceAll("-", "");
}

export async function synchronizeSupplierDebtDueNotifications() {
  const today = new Date(`${getJakartaDateKey().replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")}T00:00:00.000Z`);
  const todayKey = getJakartaDateKey();
  const targetOffsets = new Set([7, 3, 1, 0]);

  const purchases = await db.purchase.findMany({
    where: {
      status: "RECEIVED",
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
      dueDate: { not: null },
      remainingDebt: { gt: 0 },
    },
    select: {
      id: true,
      purchaseNumber: true,
      supplierName: true,
      dueDate: true,
      remainingDebt: true,
    },
  });

  for (const purchase of purchases) {
    if (!purchase.dueDate) continue;
    const diffDays = Math.round(
      (purchase.dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (!targetOffsets.has(diffDays)) continue;

    const existing = await db.notification.findFirst({
      where: {
        type: "SUPPLIER_DEBT_DUE",
        referenceType: "PURCHASE",
        referenceId: purchase.id,
        createdAt: {
          gte: new Date(`${todayKey.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")}T00:00:00.000Z`),
        },
      },
      select: { id: true },
    });

    const title = diffDays === 0 ? "Hutang supplier jatuh tempo hari ini" : `Hutang supplier jatuh tempo H-${diffDays}`;
    const message = `${purchase.purchaseNumber} (${purchase.supplierName}) sisa hutang Rp${purchase.remainingDebt.toString()}.`;

    if (existing) {
      await db.notification.update({
        where: { id: existing.id },
        data: { title, message, isRead: false },
      });
    } else {
      await db.notification.create({
        data: {
          userId: null,
          type: "SUPPLIER_DEBT_DUE",
          title,
          message,
          referenceType: "PURCHASE",
          referenceId: purchase.id,
        },
      });
    }
  }
}

export async function getUnreadNotificationCountForCurrentUser() {
  const session = await auth();
  const user = session?.user;
  if (!user || !isAppRole(user.role)) return 0;

  return db.notification.count({
    where: {
      isRead: false,
      OR: [
        { userId: user.id },
        ...(user.role === "OWNER" ? [{ userId: null }] : []),
      ],
    },
  });
}
