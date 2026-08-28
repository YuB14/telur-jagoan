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
  calculateRestoredStock,
  calculateReturnSubtotal,
} from "@/lib/sale-reversal";
import { isAppRole } from "@/lib/permissions";
import { requireOwner } from "@/server/services/authorization";
import type { CancelSaleFormInput, SaleReturnFormInput } from "@/server/validations/sales";

export class SaleServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaleServiceError";
  }
}

const QUANTITY_MAX = new Prisma.Decimal("99999999999.999");

async function requireSalesUser() {
  const session = await auth();
  const user = session?.user;

  if (!user || !isAppRole(user.role)) {
    throw new SaleServiceError("Anda harus login untuk melihat penjualan.");
  }

  return user;
}

function getJakartaDayRange(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const keyed = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(keyed.year);
  const month = Number(keyed.month);
  const day = Number(keyed.day);

  return {
    start: new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0)),
    end: new Date(Date.UTC(year, month - 1, day + 1, -7, 0, 0, -1)),
  };
}

function getDateKey(value = new Date()) {
  return value.toISOString().slice(0, 10).replaceAll("-", "");
}

function isRetryableTransactionError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return error.code === "P2002" || error.code === "P2034";
}

function assertQuantityFits(value: Prisma.Decimal, message: string) {
  if (value.abs().greaterThan(QUANTITY_MAX) || value.decimalPlaces() > 3) {
    throw new SaleServiceError(message);
  }
}

async function getNextStockMovementState(
  transaction: Prisma.TransactionClient,
  dateKey: string,
) {
  const movementPrefix = getDatedNumberPrefix("STK", dateKey);
  const movementNumbers = await transaction.stockMovement.findMany({
    where: { movementNumber: { startsWith: movementPrefix } },
    select: { movementNumber: true },
  });

  return getNextDatedSequence(
    movementNumbers.map((movement) => movement.movementNumber),
    "STK",
    dateKey,
  );
}

async function getNextReturnNumber(transaction: Prisma.TransactionClient, dateKey: string) {
  const returnPrefix = getDatedNumberPrefix("SRT", dateKey);
  const returnNumbers = await transaction.saleReturn.findMany({
    where: { returnNumber: { startsWith: returnPrefix } },
    select: { returnNumber: true },
  });

  return formatDatedNumber(
    "SRT",
    dateKey,
    getNextDatedSequence(
      returnNumbers.map((saleReturn) => saleReturn.returnNumber),
      "SRT",
      dateKey,
    ),
  );
}

export async function listSales(options: { todayOnly?: boolean } = {}) {
  const user = await requireSalesUser();
  const today = options.todayOnly ? getJakartaDayRange() : null;

  const sales = await db.sale.findMany({
    where: {
      ...(user.role === "CASHIER" ? { cashierId: user.id } : {}),
      ...(today ? { saleDate: { gte: today.start, lte: today.end } } : {}),
    },
    orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      saleNumber: true,
      saleDate: true,
      grandTotal: true,
      amountPaid: true,
      changeAmount: true,
      status: true,
      printCount: true,
      lastPrintedAt: true,
      cashier: { select: { name: true } },
      customer: { select: { name: true } },
      payments: {
        orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
        select: {
          amount: true,
          paymentMethod: { select: { name: true, type: true } },
        },
      },
      _count: { select: { items: true, returns: true } },
    },
  });

  return { sales, role: user.role };
}

export async function getSaleDetail(id: string) {
  const user = await requireSalesUser();

  const sale = await db.sale.findFirst({
    where: {
      id,
      ...(user.role === "CASHIER" ? { cashierId: user.id } : {}),
    },
    select: {
      id: true,
      saleNumber: true,
      saleDate: true,
      subtotal: true,
      discountAmount: true,
      taxAmount: true,
      grandTotal: true,
      amountPaid: true,
      changeAmount: true,
      totalCost: true,
      grossProfit: true,
      status: true,
      printCount: true,
      lastPrintedAt: true,
      notes: true,
      cashier: { select: { name: true } },
      customer: { select: { name: true } },
      cashSession: { select: { sessionNumber: true } },
      items: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          productNameSnapshot: true,
          unitNameSnapshot: true,
          quantity: true,
          baseQuantity: true,
          unitPrice: true,
          discountAmount: true,
          subtotal: true,
          product: { select: { baseUnitName: true } },
          returnItems: {
            where: { saleReturn: { status: "COMPLETED" } },
            select: { quantity: true },
          },
        },
      },
      payments: {
        orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
        select: {
          amount: true,
          referenceNumber: true,
          paidAt: true,
          paymentMethod: { select: { name: true, type: true } },
        },
      },
      returns: {
        orderBy: [{ returnDate: "desc" }, { createdAt: "desc" }],
        select: {
          returnNumber: true,
          returnDate: true,
          reason: true,
          totalAmount: true,
          status: true,
          approver: { select: { name: true } },
        },
      },
    },
  });

  if (!sale) {
    throw new SaleServiceError("Penjualan tidak ditemukan atau tidak dapat diakses.");
  }

  return {
    sale,
    role: user.role,
    items: sale.items.map((item) => {
      const returnedQuantity = item.returnItems.reduce(
        (total, returnItem) => total.add(returnItem.quantity),
        new Prisma.Decimal(0),
      );

      return {
        ...item,
        returnedQuantity,
        returnableQuantity: item.baseQuantity.sub(returnedQuantity),
      };
    }),
  };
}

export async function recordSaleReceiptPrint(id: string) {
  const user = await requireSalesUser();

  const sale = await db.sale.findFirst({
    where: {
      id,
      ...(user.role === "CASHIER" ? { cashierId: user.id } : {}),
    },
    select: { id: true },
  });

  if (!sale) {
    throw new SaleServiceError("Penjualan tidak ditemukan atau tidak dapat dicetak.");
  }

  await db.sale.update({
    where: { id },
    data: {
      printCount: { increment: 1 },
      lastPrintedAt: new Date(),
    },
  });
}

export async function cancelSale(id: string, input: CancelSaleFormInput) {
  const owner = await requireOwner();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const sale = await transaction.sale.findUnique({
            where: { id },
            select: {
              id: true,
              saleNumber: true,
              cashSessionId: true,
              grandTotal: true,
              status: true,
              notes: true,
              items: {
                select: {
                  id: true,
                  productId: true,
                  baseQuantity: true,
                  allocations: {
                    select: {
                      inventoryBatchId: true,
                      quantity: true,
                    },
                  },
                },
              },
            },
          });

          if (!sale) throw new SaleServiceError("Penjualan tidak ditemukan.");
          if (sale.status !== "COMPLETED") {
            throw new SaleServiceError("Hanya penjualan COMPLETED yang dapat dibatalkan.");
          }

          const productIds = [...new Set(sale.items.map((item) => item.productId))];
          const products = await transaction.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, currentStock: true },
          });
          const productStockById = new Map(
            products.map((product) => [product.id, product.currentStock]),
          );

          const dateKey = getDateKey();
          let nextMovementSequence = await getNextStockMovementState(transaction, dateKey);

          for (const item of sale.items) {
            if (!item.allocations.length) {
              throw new SaleServiceError("Alokasi batch penjualan tidak lengkap.");
            }

            for (const allocation of item.allocations) {
              const stockBefore = productStockById.get(item.productId);
              if (!stockBefore) throw new SaleServiceError("Produk penjualan tidak ditemukan.");

              const stockAfter = calculateRestoredStock(stockBefore, allocation.quantity);
              assertQuantityFits(stockAfter, "Stok hasil pembatalan melebihi batas database.");

              await transaction.inventoryBatch.update({
                where: { id: allocation.inventoryBatchId },
                data: {
                  remainingQuantity: { increment: allocation.quantity },
                  status: "ACTIVE",
                },
              });
              await transaction.product.update({
                where: { id: item.productId },
                data: { currentStock: stockAfter },
              });
              await transaction.stockMovement.create({
                data: {
                  movementNumber: formatDatedNumber("STK", dateKey, nextMovementSequence),
                  productId: item.productId,
                  inventoryBatchId: allocation.inventoryBatchId,
                  movementType: "SALE_RETURN",
                  quantityIn: allocation.quantity,
                  quantityOut: 0,
                  stockBefore,
                  stockAfter,
                  referenceType: "SALE_CANCEL",
                  referenceId: sale.id,
                  description: `Pembatalan ${sale.saleNumber}: ${input.reason}`,
                  createdBy: owner.id,
                },
              });
              nextMovementSequence += 1;
              productStockById.set(item.productId, stockAfter);
            }
          }

          await transaction.cashMovement.create({
            data: {
              cashSessionId: sale.cashSessionId,
              movementType: "REFUND_CASH",
              amount: sale.grandTotal,
              description: `Pembatalan ${sale.saleNumber}: ${input.reason}`,
              referenceType: "SALE_CANCEL",
              referenceId: sale.id,
              createdBy: owner.id,
            },
          });

          await transaction.sale.update({
            where: { id: sale.id },
            data: {
              status: "CANCELLED",
              notes: sale.notes
                ? `${sale.notes}\nPembatalan: ${input.reason}`
                : `Pembatalan: ${input.reason}`,
            },
          });

          return { saleNumber: sale.saleNumber };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }

  throw new SaleServiceError("Penjualan belum dapat dibatalkan.");
}

export async function createSaleReturn(id: string, input: SaleReturnFormInput) {
  const owner = await requireOwner();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const sale = await transaction.sale.findUnique({
            where: { id },
            select: {
              id: true,
              saleNumber: true,
              cashSessionId: true,
              status: true,
              items: {
                select: {
                  id: true,
                  productId: true,
                  baseQuantity: true,
                  conversionToBase: true,
                  unitPrice: true,
                  allocations: {
                    orderBy: { createdAt: "asc" },
                    select: {
                      inventoryBatchId: true,
                      quantity: true,
                    },
                  },
                  returnItems: {
                    where: { saleReturn: { status: "COMPLETED" } },
                    select: { quantity: true },
                  },
                },
              },
            },
          });

          if (!sale) throw new SaleServiceError("Penjualan tidak ditemukan.");
          if (sale.status !== "COMPLETED") {
            throw new SaleServiceError("Hanya penjualan COMPLETED yang dapat diretur.");
          }

          const itemById = new Map(sale.items.map((item) => [item.id, item]));
          const requestedItems = input.items.map((item) => {
            const saleItem = itemById.get(item.saleItemId);
            if (!saleItem) throw new SaleServiceError("Item retur tidak sesuai penjualan.");

            const quantity = new Prisma.Decimal(item.quantity);
            const returnedQuantity = saleItem.returnItems.reduce(
              (total, returnItem) => total.add(returnItem.quantity),
              new Prisma.Decimal(0),
            );
            const remainingQuantity = saleItem.baseQuantity.sub(returnedQuantity);
            if (quantity.greaterThan(remainingQuantity)) {
              throw new SaleServiceError("Jumlah retur melebihi sisa item yang dapat diretur.");
            }

            return { saleItem, quantity };
          });

          const dateKey = getDateKey();
          const returnNumber = await getNextReturnNumber(transaction, dateKey);
          let nextMovementSequence = await getNextStockMovementState(transaction, dateKey);
          const productIds = [...new Set(requestedItems.map((item) => item.saleItem.productId))];
          const products = await transaction.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, currentStock: true },
          });
          const productStockById = new Map(
            products.map((product) => [product.id, product.currentStock]),
          );

          const returnItems = requestedItems.map(({ saleItem, quantity }) => {
            const unitPricePerBase = saleItem.unitPrice.div(saleItem.conversionToBase);
            return {
              saleItemId: saleItem.id,
              productId: saleItem.productId,
              quantity,
              unitPrice: saleItem.unitPrice,
              subtotal: calculateReturnSubtotal(quantity, unitPricePerBase),
            };
          });
          const totalAmount = returnItems.reduce(
            (total, item) => total.add(item.subtotal),
            new Prisma.Decimal(0),
          );

          const saleReturn = await transaction.saleReturn.create({
            data: {
              returnNumber,
              saleId: sale.id,
              returnDate: new Date(),
              reason: input.reason,
              totalAmount,
              refundMethod: "CASH_REFUND",
              status: "COMPLETED",
              approvedBy: owner.id,
              createdBy: owner.id,
              notes: input.notes || null,
              items: { create: returnItems },
            },
            select: { id: true, returnNumber: true },
          });

          for (const { saleItem, quantity } of requestedItems) {
            let quantityLeft = quantity;

            for (const allocation of saleItem.allocations) {
              if (quantityLeft.lessThanOrEqualTo(0)) break;
              const restoreQuantity = Prisma.Decimal.min(quantityLeft, allocation.quantity);
              const stockBefore = productStockById.get(saleItem.productId);
              if (!stockBefore) throw new SaleServiceError("Produk retur tidak ditemukan.");
              const stockAfter = calculateRestoredStock(stockBefore, restoreQuantity);

              await transaction.inventoryBatch.update({
                where: { id: allocation.inventoryBatchId },
                data: {
                  remainingQuantity: { increment: restoreQuantity },
                  status: "ACTIVE",
                },
              });
              await transaction.product.update({
                where: { id: saleItem.productId },
                data: { currentStock: stockAfter },
              });
              await transaction.stockMovement.create({
                data: {
                  movementNumber: formatDatedNumber("STK", dateKey, nextMovementSequence),
                  productId: saleItem.productId,
                  inventoryBatchId: allocation.inventoryBatchId,
                  movementType: "SALE_RETURN",
                  quantityIn: restoreQuantity,
                  quantityOut: 0,
                  stockBefore,
                  stockAfter,
                  referenceType: "SALE_RETURN",
                  referenceId: saleReturn.id,
                  description: `Retur ${sale.saleNumber} / ${saleReturn.returnNumber}`,
                  createdBy: owner.id,
                },
              });
              nextMovementSequence += 1;
              productStockById.set(saleItem.productId, stockAfter);
              quantityLeft = quantityLeft.sub(restoreQuantity);
            }
          }

          await transaction.cashMovement.create({
            data: {
              cashSessionId: sale.cashSessionId,
              movementType: "REFUND_CASH",
              amount: totalAmount,
              description: `Retur ${sale.saleNumber} / ${returnNumber}`,
              referenceType: "SALE_RETURN",
              referenceId: saleReturn.id,
              createdBy: owner.id,
            },
          });

          const allReturned = sale.items.every((saleItem) => {
            const existingReturned = saleItem.returnItems.reduce(
              (total, returnItem) => total.add(returnItem.quantity),
              new Prisma.Decimal(0),
            );
            const currentReturned =
              requestedItems.find((item) => item.saleItem.id === saleItem.id)?.quantity ??
              new Prisma.Decimal(0);
            return existingReturned.add(currentReturned).equals(saleItem.baseQuantity);
          });

          if (allReturned) {
            await transaction.sale.update({
              where: { id: sale.id },
              data: { status: "REFUNDED" },
            });
          }

          return {
            saleNumber: sale.saleNumber,
            returnNumber,
            totalAmount: totalAmount.toString(),
          };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }

  throw new SaleServiceError("Retur penjualan belum dapat disimpan.");
}
