import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  formatDatedNumber,
  getDatedNumberPrefix,
  getNextDatedSequence,
} from "@/lib/inventory-number";
import { requireCashierOperator, requireOwner } from "@/server/services/authorization";
import type {
  CloseCashSessionFormInput,
  OpenCashSessionFormInput,
} from "@/server/validations/cash-session";

export class CashSessionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CashSessionServiceError";
  }
}

const MONEY_MAX = new Prisma.Decimal("999999999999.99");

function getJakartaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}${value.month}${value.day}`;
}

function isRetryableTransactionError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return error.code === "P2002" || error.code === "P2034";
}

function calculateExpectedCash(input: {
  openingCash: Prisma.Decimal;
  movements: Array<{ movementType: string; amount: Prisma.Decimal }>;
}) {
  return input.movements.reduce((total, movement) => {
    if (movement.movementType === "SALE_CASH" || movement.movementType === "CASH_IN") {
      return total.add(movement.amount);
    }
    if (movement.movementType === "CASH_OUT" || movement.movementType === "REFUND_CASH") {
      return total.sub(movement.amount);
    }
    return total;
  }, input.openingCash);
}

export async function getCashSessionOpeningData() {
  const cashier = await requireCashierOperator();
  const [registers, activeSession] = await Promise.all([
    db.cashRegister.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, location: true },
    }),
    db.cashSession.findFirst({
      where: { cashierId: cashier.id, status: "OPEN" },
      orderBy: { openedAt: "desc" },
      select: {
        id: true,
        sessionNumber: true,
        openedAt: true,
        openingCash: true,
        notes: true,
        cashRegister: { select: { code: true, name: true, location: true } },
      },
    }),
  ]);

  return { registers, activeSession };
}

export async function listCashSessions(status?: "OPEN" | "CLOSED") {
  await requireOwner();

  return db.cashSession.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ openedAt: "desc" }],
    select: {
      id: true,
      sessionNumber: true,
      openedAt: true,
      closedAt: true,
      openingCash: true,
      expectedCash: true,
      actualCash: true,
      cashDifference: true,
      status: true,
      cashier: { select: { name: true, username: true } },
      cashRegister: { select: { code: true, name: true } },
      sales: {
        where: { status: { not: "CANCELLED" } },
        select: { grandTotal: true },
      },
    },
  });
}

export async function getCashierDashboardData() {
  const cashier = await requireCashierOperator();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const activeSession = await db.cashSession.findFirst({
    where: { cashierId: cashier.id, status: "OPEN" },
    orderBy: { openedAt: "desc" },
    select: {
      id: true,
      sessionNumber: true,
      openedAt: true,
      openingCash: true,
      cashRegister: { select: { code: true, name: true } },
      cashMovements: {
        select: { movementType: true, amount: true },
      },
      sales: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { saleDate: "desc" },
        take: 5,
        select: {
          id: true,
          saleNumber: true,
          saleDate: true,
          grandTotal: true,
          payments: {
            select: {
              amount: true,
              paymentMethod: { select: { type: true, name: true } },
            },
          },
        },
      },
    },
  });

  const todaySales = await db.sale.findMany({
    where: {
      cashierId: cashier.id,
      saleDate: { gte: todayStart, lte: todayEnd },
      status: { not: "CANCELLED" },
    },
    select: {
      grandTotal: true,
      payments: {
        select: {
          amount: true,
          paymentMethod: { select: { type: true } },
        },
      },
    },
  });

  const paymentTotals = { CASH: new Prisma.Decimal(0), QRIS: new Prisma.Decimal(0), TRANSFER: new Prisma.Decimal(0) };
  for (const sale of todaySales) {
    for (const payment of sale.payments) {
      if (payment.paymentMethod.type === "CASH" || payment.paymentMethod.type === "QRIS" || payment.paymentMethod.type === "TRANSFER") {
        paymentTotals[payment.paymentMethod.type] = paymentTotals[payment.paymentMethod.type].add(payment.amount);
      }
    }
  }

  return {
    cashier,
    activeSession,
    expectedCash: activeSession
      ? calculateExpectedCash({
        openingCash: activeSession.openingCash,
        movements: activeSession.cashMovements,
      })
      : null,
    todaySummary: {
      transactionCount: todaySales.length,
      totalSales: todaySales.reduce((total, sale) => total.add(sale.grandTotal), new Prisma.Decimal(0)),
      paymentTotals,
    },
  };
}

export async function getCashSessionClosingData() {
  const cashier = await requireCashierOperator();
  const activeSession = await db.cashSession.findFirst({
    where: { cashierId: cashier.id, status: "OPEN" },
    orderBy: { openedAt: "desc" },
    select: {
      id: true,
      sessionNumber: true,
      openedAt: true,
      openingCash: true,
      cashRegister: { select: { code: true, name: true } },
      cashMovements: { select: { movementType: true, amount: true } },
      sales: {
        where: { status: { not: "CANCELLED" } },
        select: { grandTotal: true },
      },
    },
  });

  if (!activeSession) return { activeSession: null, expectedCash: null };

  return {
    activeSession,
    expectedCash: calculateExpectedCash({
      openingCash: activeSession.openingCash,
      movements: activeSession.cashMovements,
    }),
  };
}

export async function closeCashSession(input: CloseCashSessionFormInput) {
  const cashier = await requireCashierOperator();
  const actualCash = new Prisma.Decimal(input.actualCash);

  if (actualCash.isNegative() || actualCash.greaterThan(MONEY_MAX)) {
    throw new CashSessionServiceError("Kas fisik berada di luar batas yang diizinkan.");
  }

  return db.$transaction(async (transaction) => {
    const activeSession = await transaction.cashSession.findFirst({
      where: { cashierId: cashier.id, status: "OPEN" },
      orderBy: { openedAt: "desc" },
      select: {
        id: true,
        sessionNumber: true,
        openingCash: true,
        notes: true,
        cashMovements: { select: { movementType: true, amount: true } },
      },
    });

    if (!activeSession) {
      throw new CashSessionServiceError("Tidak ada sesi kasir aktif untuk ditutup.");
    }

    const expectedCash = calculateExpectedCash({
      openingCash: activeSession.openingCash,
      movements: activeSession.cashMovements,
    });
    const cashDifference = actualCash.sub(expectedCash);
    const notes = [activeSession.notes, input.notes ? `Penutupan: ${input.notes}` : null]
      .filter(Boolean)
      .join("\n") || null;

    await transaction.cashSession.update({
      where: { id: activeSession.id },
      data: {
        closedAt: new Date(),
        expectedCash,
        actualCash,
        cashDifference,
        status: "CLOSED",
        notes,
      },
    });

    await transaction.activityLog.create({
      data: {
        userId: cashier.id,
        action: "CLOSE_CASH_SESSION",
        entityType: "CASH_SESSION",
        entityId: activeSession.id,
        newValues: {
          sessionNumber: activeSession.sessionNumber,
          expectedCash: expectedCash.toString(),
          actualCash: actualCash.toString(),
          cashDifference: cashDifference.toString(),
        },
      },
    });

    if (!cashDifference.equals(0)) {
      await transaction.notification.create({
        data: {
          userId: null,
          type: "CASH_DIFFERENCE",
          title: "Selisih kas saat tutup kasir",
          message: `${activeSession.sessionNumber} memiliki selisih kas ${cashDifference.toString()}.`,
          referenceType: "CASH_SESSION",
          referenceId: activeSession.id,
        },
      });
    }

    return {
      sessionNumber: activeSession.sessionNumber,
      expectedCash,
      actualCash,
      cashDifference,
    };
  });
}

export async function openCashSession(input: OpenCashSessionFormInput) {
  const cashier = await requireCashierOperator();
  const openingCash = new Prisma.Decimal(input.openingCash);

  if (openingCash.isNegative() || openingCash.greaterThan(MONEY_MAX)) {
    throw new CashSessionServiceError("Modal awal berada di luar batas yang diizinkan.");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const [cashRegister, activeSession] = await Promise.all([
            transaction.cashRegister.findFirst({
              where: { id: input.cashRegisterId, isActive: true },
              select: { id: true },
            }),
            transaction.cashSession.findFirst({
              where: { cashierId: cashier.id, status: "OPEN" },
              select: { sessionNumber: true },
            }),
          ]);

          if (!cashRegister) {
            throw new CashSessionServiceError("Perangkat kasir aktif tidak ditemukan.");
          }
          if (activeSession) {
            throw new CashSessionServiceError(
              `Anda masih memiliki sesi aktif ${activeSession.sessionNumber}. Tutup sesi tersebut terlebih dahulu.`,
            );
          }

          const now = new Date();
          const dateKey = getJakartaDateKey(now);
          const prefix = getDatedNumberPrefix("SES", dateKey);
          const existingNumbers = await transaction.cashSession.findMany({
            where: { sessionNumber: { startsWith: prefix } },
            select: { sessionNumber: true },
          });
          const sequence = getNextDatedSequence(
            existingNumbers.map((session) => session.sessionNumber),
            "SES",
            dateKey,
          );
          const sessionNumber = formatDatedNumber("SES", dateKey, sequence);

          const cashSession = await transaction.cashSession.create({
            data: {
              sessionNumber,
              cashRegisterId: cashRegister.id,
              cashierId: cashier.id,
              openedAt: now,
              openingCash,
              status: "OPEN",
              notes: input.notes ?? null,
            },
            select: { id: true, sessionNumber: true },
          });

          await transaction.cashMovement.create({
            data: {
              cashSessionId: cashSession.id,
              movementType: "OPENING_CASH",
              amount: openingCash,
              description: `Modal awal ${cashSession.sessionNumber}`,
              referenceType: "CASH_SESSION",
              referenceId: cashSession.id,
              createdBy: cashier.id,
            },
          });

          return cashSession;
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      if (isRetryableTransactionError(error)) {
        throw new CashSessionServiceError(
          "Sesi kasir berubah bersamaan. Muat ulang halaman dan coba lagi.",
        );
      }
      throw error;
    }
  }

  throw new CashSessionServiceError("Sesi kasir belum dapat dibuka.");
}
