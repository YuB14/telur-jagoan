import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  formatDatedNumber,
  getDatedNumberPrefix,
  getNextDatedSequence,
} from "@/lib/inventory-number";
import { requireCashierOperator } from "@/server/services/authorization";
import type { PosCheckoutFormInput } from "@/server/validations/pos";

export class PosServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PosServiceError";
  }
}

const ALLOWED_PAYMENT_TYPES = ["CASH", "QRIS", "TRANSFER"] as const;
const ZERO = new Prisma.Decimal(0);

function getDateKey(value = new Date()) {
  return value.toISOString().slice(0, 10).replaceAll("-", "");
}

function isRetryableTransactionError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return error.code === "P2002" || error.code === "P2034";
}

function toMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2);
}

function sumDecimals(values: Prisma.Decimal[]) {
  return values.reduce((total, value) => total.add(value), ZERO);
}

async function getNextSaleNumber(transaction: Prisma.TransactionClient, dateKey: string) {
  const prefix = getDatedNumberPrefix("SAL", dateKey);
  const sales = await transaction.sale.findMany({
    where: { saleNumber: { startsWith: prefix } },
    select: { saleNumber: true },
  });

  return formatDatedNumber(
    "SAL",
    dateKey,
    getNextDatedSequence(sales.map((sale) => sale.saleNumber), "SAL", dateKey),
  );
}

async function getNextStockMovementState(
  transaction: Prisma.TransactionClient,
  dateKey: string,
) {
  const prefix = getDatedNumberPrefix("STK", dateKey);
  const movements = await transaction.stockMovement.findMany({
    where: { movementNumber: { startsWith: prefix } },
    select: { movementNumber: true },
  });

  return getNextDatedSequence(
    movements.map((movement) => movement.movementNumber),
    "STK",
    dateKey,
  );
}

export async function getPosPageData() {
  const cashier = await requireCashierOperator();
  const [activeSession, products, paymentMethods] = await Promise.all([
    db.cashSession.findFirst({
      where: { cashierId: cashier.id, status: "OPEN" },
      orderBy: { openedAt: "desc" },
      select: {
        id: true,
        sessionNumber: true,
        openedAt: true,
        cashRegister: { select: { code: true, name: true } },
      },
    }),
    db.product.findMany({
      where: { isActive: true, units: { some: { isActive: true } } },
      orderBy: [{ name: "asc" }, { productCode: "asc" }],
      select: {
        id: true,
        productCode: true,
        barcode: true,
        name: true,
        imageUrl: true,
        baseUnitName: true,
        currentStock: true,
        category: { select: { name: true } },
        units: {
          where: { isActive: true },
          orderBy: [{ isBaseUnit: "desc" }, { unitName: "asc" }],
          select: {
            id: true,
            unitName: true,
            conversionToBase: true,
            sellingPrice: true,
            barcode: true,
            isBaseUnit: true,
          },
        },
      },
    }),
    db.paymentMethod.findMany({
      where: {
        isActive: true,
        type: { in: [...ALLOWED_PAYMENT_TYPES] },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    }),
  ]);

  return {
    activeSession,
    paymentMethods,
    products: products.map((product) => ({
      ...product,
      currentStock: product.currentStock.toString(),
      units: product.units.map((unit) => ({
        ...unit,
        conversionToBase: unit.conversionToBase.toString(),
        sellingPrice: unit.sellingPrice.toString(),
      })),
    })),
  };
}

export async function createPosSale(input: PosCheckoutFormInput) {
  const cashier = await requireCashierOperator();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const activeSession = await transaction.cashSession.findFirst({
            where: { cashierId: cashier.id, status: "OPEN" },
            orderBy: { openedAt: "desc" },
            select: { id: true, sessionNumber: true },
          });

          if (!activeSession) {
            throw new PosServiceError("Sesi kasir belum dibuka.");
          }

          const generalCustomer = await transaction.customer.findFirst({
            where: { customerCode: "CUS-0000", isActive: true },
            select: { id: true },
          });

          if (!generalCustomer) {
            throw new PosServiceError("Record Pelanggan Umum belum tersedia.");
          }

          const mergedItems = new Map<string, {
            productId: string;
            productUnitId: string;
            quantity: Prisma.Decimal;
          }>();
          for (const item of input.items) {
            const key = `${item.productId}:${item.productUnitId}`;
            const quantity = new Prisma.Decimal(item.quantity);
            const existing = mergedItems.get(key);
            mergedItems.set(key, {
              productId: item.productId,
              productUnitId: item.productUnitId,
              quantity: existing ? existing.quantity.add(quantity) : quantity,
            });
          }

          const requestedItems = [...mergedItems.values()];
          const productUnitIds = requestedItems.map((item) => item.productUnitId);
          const productUnits = await transaction.productUnit.findMany({
            where: { id: { in: productUnitIds }, isActive: true, product: { isActive: true } },
            select: {
              id: true,
              productId: true,
              unitName: true,
              conversionToBase: true,
              sellingPrice: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  productCode: true,
                  currentStock: true,
                  baseUnitName: true,
                },
              },
            },
          });
          const productUnitById = new Map(productUnits.map((unit) => [unit.id, unit]));

          const saleItems = requestedItems.map((item) => {
            const unit = productUnitById.get(item.productUnitId);
            if (!unit || unit.productId !== item.productId) {
              throw new PosServiceError("Produk atau satuan di keranjang tidak valid.");
            }

            const baseQuantity = item.quantity.mul(unit.conversionToBase).toDecimalPlaces(3);
            const subtotal = toMoney(item.quantity.mul(unit.sellingPrice));

            return {
              productId: item.productId,
              productUnitId: item.productUnitId,
              productNameSnapshot: unit.product.name,
              unitNameSnapshot: unit.unitName,
              quantity: item.quantity,
              conversionToBase: unit.conversionToBase,
              baseQuantity,
              unitPrice: unit.sellingPrice,
              discountAmount: ZERO,
              subtotal,
              product: unit.product,
            };
          });

          const demandByProductId = new Map<string, Prisma.Decimal>();
          for (const item of saleItems) {
            demandByProductId.set(
              item.productId,
              (demandByProductId.get(item.productId) ?? ZERO).add(item.baseQuantity),
            );
          }

          for (const [productId, demand] of demandByProductId) {
            const item = saleItems.find((candidate) => candidate.productId === productId);
            if (!item) continue;
            if (demand.greaterThan(item.product.currentStock)) {
              throw new PosServiceError(`Stok ${item.product.name} tidak mencukupi.`);
            }
          }

          const subtotal = sumDecimals(saleItems.map((item) => item.subtotal));
          const discountAmount = toMoney(new Prisma.Decimal(input.discountAmount ?? "0"));
          if (discountAmount.lessThan(0) || discountAmount.greaterThan(subtotal)) {
            throw new PosServiceError("Diskon tidak boleh melebihi subtotal.");
          }
          const grandTotal = subtotal.sub(discountAmount);

          const paymentMethodIds = input.payments.map((payment) => payment.paymentMethodId);
          const paymentMethods = await transaction.paymentMethod.findMany({
            where: {
              id: { in: paymentMethodIds },
              isActive: true,
              type: { in: [...ALLOWED_PAYMENT_TYPES] },
            },
            select: { id: true, type: true },
          });
          const paymentMethodById = new Map(paymentMethods.map((method) => [method.id, method]));

          const payments = input.payments.map((payment) => {
            const method = paymentMethodById.get(payment.paymentMethodId);
            if (!method) throw new PosServiceError("Metode pembayaran tidak valid.");
            return {
              paymentMethodId: payment.paymentMethodId,
              amount: toMoney(new Prisma.Decimal(payment.amount)),
              referenceNumber: payment.referenceNumber ?? null,
              type: method.type,
            };
          });
          const amountPaid = sumDecimals(payments.map((payment) => payment.amount));
          if (amountPaid.lessThan(grandTotal)) {
            throw new PosServiceError("Total pembayaran belum mencukupi total belanja.");
          }
          const changeAmount = amountPaid.sub(grandTotal);
          const cashPaymentTotal = sumDecimals(
            payments
              .filter((payment) => payment.type === "CASH")
              .map((payment) => payment.amount),
          );
          if (changeAmount.greaterThan(cashPaymentTotal)) {
            throw new PosServiceError("Kembalian hanya dapat dihitung dari pembayaran tunai.");
          }

          const dateKey = getDateKey();
          const [saleNumber, nextMovementStart] = await Promise.all([
            getNextSaleNumber(transaction, dateKey),
            getNextStockMovementState(transaction, dateKey),
          ]);
          let nextMovementSequence = nextMovementStart;
          let totalCost = ZERO;

          const sale = await transaction.sale.create({
            data: {
              saleNumber,
              customerId: generalCustomer.id,
              cashierId: cashier.id,
              cashSessionId: activeSession.id,
              subtotal,
              discountAmount,
              taxAmount: ZERO,
              grandTotal,
              amountPaid,
              changeAmount,
              totalCost: ZERO,
              grossProfit: ZERO,
              printCount: 1,
              lastPrintedAt: new Date(),
              notes: input.notes ?? null,
            },
            select: { id: true, saleNumber: true },
          });

          const productStockById = new Map(
            saleItems.map((item) => [item.productId, item.product.currentStock]),
          );

          for (const item of saleItems) {
            const saleItem = await transaction.saleItem.create({
              data: {
                saleId: sale.id,
                productId: item.productId,
                productUnitId: item.productUnitId,
                productNameSnapshot: item.productNameSnapshot,
                unitNameSnapshot: item.unitNameSnapshot,
                quantity: item.quantity,
                conversionToBase: item.conversionToBase,
                baseQuantity: item.baseQuantity,
                unitPrice: item.unitPrice,
                discountAmount: item.discountAmount,
                subtotal: item.subtotal,
              },
              select: { id: true },
            });

            const batches = await transaction.inventoryBatch.findMany({
              where: {
                productId: item.productId,
                status: "ACTIVE",
                remainingQuantity: { gt: 0 },
              },
              orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
              select: {
                id: true,
                remainingQuantity: true,
                baseUnitCost: true,
              },
            });

            let remainingToAllocate = item.baseQuantity;
            let itemCost = ZERO;

            for (const batch of batches) {
              if (remainingToAllocate.lessThanOrEqualTo(0)) break;
              const allocatedQuantity = Prisma.Decimal.min(
                remainingToAllocate,
                batch.remainingQuantity,
              );
              const allocationCost = toMoney(allocatedQuantity.mul(batch.baseUnitCost));
              itemCost = itemCost.add(allocationCost);

              await transaction.saleBatchAllocation.create({
                data: {
                  saleItemId: saleItem.id,
                  inventoryBatchId: batch.id,
                  quantity: allocatedQuantity,
                  unitCost: batch.baseUnitCost,
                  totalCost: allocationCost,
                },
              });

              const batchRemaining = batch.remainingQuantity.sub(allocatedQuantity);
              await transaction.inventoryBatch.update({
                where: { id: batch.id },
                data: {
                  remainingQuantity: batchRemaining,
                  status: batchRemaining.equals(0) ? "DEPLETED" : "ACTIVE",
                },
              });

              const stockBefore = productStockById.get(item.productId);
              if (!stockBefore) throw new PosServiceError("Stok produk tidak ditemukan.");
              const stockAfter = stockBefore.sub(allocatedQuantity);
              await transaction.stockMovement.create({
                data: {
                  movementNumber: formatDatedNumber("STK", dateKey, nextMovementSequence),
                  productId: item.productId,
                  inventoryBatchId: batch.id,
                  movementType: "SALE",
                  quantityIn: ZERO,
                  quantityOut: allocatedQuantity,
                  stockBefore,
                  stockAfter,
                  referenceType: "SALE",
                  referenceId: sale.id,
                  description: `Penjualan ${sale.saleNumber}`,
                  createdBy: cashier.id,
                },
              });
              nextMovementSequence += 1;
              productStockById.set(item.productId, stockAfter);
              remainingToAllocate = remainingToAllocate.sub(allocatedQuantity);
            }

            if (remainingToAllocate.greaterThan(0)) {
              throw new PosServiceError(`Batch stok ${item.productNameSnapshot} tidak mencukupi.`);
            }

            const itemProfit = item.subtotal.sub(item.discountAmount).sub(itemCost);
            totalCost = totalCost.add(itemCost);
            await transaction.saleItem.update({
              where: { id: saleItem.id },
              data: {
                costAmount: itemCost,
                profitAmount: itemProfit,
              },
            });
          }

          for (const [productId, stockAfter] of productStockById) {
            await transaction.product.update({
              where: { id: productId },
              data: { currentStock: stockAfter },
            });
          }

          await transaction.salePayment.createMany({
            data: payments.map((payment) => ({
              saleId: sale.id,
              paymentMethodId: payment.paymentMethodId,
              amount: payment.amount,
              referenceNumber: payment.referenceNumber,
              createdBy: cashier.id,
            })),
          });

          const netCashPaymentTotal = cashPaymentTotal.sub(changeAmount);
          if (netCashPaymentTotal.greaterThan(0)) {
            await transaction.cashMovement.create({
              data: {
                cashSessionId: activeSession.id,
                movementType: "SALE_CASH",
                amount: netCashPaymentTotal,
                description: `Pembayaran tunai ${sale.saleNumber}`,
                referenceType: "SALE",
                referenceId: sale.id,
                createdBy: cashier.id,
              },
            });
          }

          const grossProfit = grandTotal.sub(totalCost);
          await transaction.sale.update({
            where: { id: sale.id },
            data: { totalCost, grossProfit },
          });

          await transaction.activityLog.create({
            data: {
              userId: cashier.id,
              action: "CREATE_SALE",
              entityType: "SALE",
              entityId: sale.id,
              newValues: {
                saleNumber: sale.saleNumber,
                subtotal: subtotal.toString(),
                grandTotal: grandTotal.toString(),
                amountPaid: amountPaid.toString(),
              },
            },
          });

          return {
            id: sale.id,
            saleNumber: sale.saleNumber,
          };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }

  throw new PosServiceError("Transaksi belum dapat disimpan.");
}
