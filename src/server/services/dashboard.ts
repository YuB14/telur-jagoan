import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireOwner } from "@/server/services/authorization";

function getJakartaDayRange(date = new Date()) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return {
    start: new Date(`${dateKey}T00:00:00+07:00`),
    end: new Date(`${dateKey}T23:59:59.999+07:00`),
  };
}

function getJakartaWeekRange(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";

  const dayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const dayOffset = dayMap[weekday] ?? 0;
  const currentDate = new Date(`${year}-${month}-${day}T00:00:00+07:00`);
  const mondayDate = new Date(currentDate);
  mondayDate.setDate(currentDate.getDate() - dayOffset);

  const mondayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(mondayDate);

  const todayKey = `${year}-${month}-${day}`;

  return {
    start: new Date(`${mondayKey}T00:00:00+07:00`),
    end: new Date(`${todayKey}T23:59:59.999+07:00`),
  };
}

function getJakartaMonthRange(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";

  return {
    start: new Date(`${year}-${month}-01T00:00:00+07:00`),
    end: new Date(`${year}-${month}-${day}T23:59:59.999+07:00`),
  };
}

function getJakartaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getJakartaDaySeries(days = 7) {
  const todayKey = getJakartaDateKey(new Date());
  const todayStart = new Date(`${todayKey}T00:00:00+07:00`);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(todayStart);
    date.setDate(todayStart.getDate() - (days - 1 - index));
    const key = getJakartaDateKey(date);

    return {
      key,
      label: new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
      }).format(date),
      start: new Date(`${key}T00:00:00+07:00`),
      end: new Date(`${key}T23:59:59.999+07:00`),
    };
  });
}

export async function getOwnerDashboardData() {
  await requireOwner();

  const { start, end } = getJakartaDayRange();
  const weekRange = getJakartaWeekRange();
  const monthRange = getJakartaMonthRange();
  const dailyRanges = getJakartaDaySeries(7);
  const zero = new Prisma.Decimal(0);

  const [
    todaySales,
    weekSales,
    monthSales,
    monthPurchases,
    todayExpenses,
    debtPurchases,
    openSessions,
    products,
    recentSales,
    todaySaleItems,
    chartSales,
  ] = await Promise.all([
    db.sale.findMany({
      where: {
        saleDate: { gte: start, lte: end },
        status: { not: "CANCELLED" },
      },
      select: { grandTotal: true, grossProfit: true },
    }),
    db.sale.findMany({
      where: {
        saleDate: { gte: weekRange.start, lte: weekRange.end },
        status: { not: "CANCELLED" },
      },
      select: { grandTotal: true },
    }),
    db.sale.findMany({
      where: {
        saleDate: { gte: monthRange.start, lte: monthRange.end },
        status: { not: "CANCELLED" },
      },
      select: { grandTotal: true },
    }),
    db.purchase.findMany({
      where: {
        purchaseDate: { gte: monthRange.start, lte: monthRange.end },
        status: { not: "CANCELLED" },
      },
      select: { grandTotal: true },
    }),
    db.expense.findMany({
      where: {
        expenseDate: { gte: start, lte: end },
        deletedAt: null,
      },
      select: { amount: true },
    }),
    db.purchase.findMany({
      where: {
        status: "RECEIVED",
        paymentStatus: { in: ["UNPAID", "PARTIAL"] },
        remainingDebt: { gt: 0 },
      },
      select: { remainingDebt: true },
    }),
    db.cashSession.count({ where: { status: "OPEN" } }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        productCode: true,
        name: true,
        baseUnitName: true,
        minimumStock: true,
        currentStock: true,
      },
    }),
    db.sale.findMany({
      where: { status: { not: "CANCELLED" } },
      orderBy: { saleDate: "desc" },
      take: 6,
      select: {
        id: true,
        saleNumber: true,
        saleDate: true,
        grandTotal: true,
        customer: { select: { name: true } },
      },
    }),
    db.saleItem.findMany({
      where: {
        sale: {
          saleDate: { gte: start, lte: end },
          status: { not: "CANCELLED" },
        },
      },
      select: {
        productId: true,
        productNameSnapshot: true,
        unitNameSnapshot: true,
        quantity: true,
        subtotal: true,
      },
    }),
    db.sale.findMany({
      where: {
        saleDate: {
          gte: dailyRanges[0].start,
          lte: dailyRanges[dailyRanges.length - 1].end,
        },
        status: { not: "CANCELLED" },
      },
      select: { saleDate: true, grandTotal: true, grossProfit: true },
    }),
  ]);

  const lowStockProducts = products
    .filter((product) => product.currentStock.lessThanOrEqualTo(product.minimumStock))
    .slice(0, 6);

  const topProductMap = new Map<
    string,
    { productId: string; name: string; unitName: string; quantity: Prisma.Decimal; subtotal: Prisma.Decimal }
  >();

  for (const item of todaySaleItems) {
    const existing = topProductMap.get(item.productId);
    if (existing) {
      existing.quantity = existing.quantity.add(item.quantity);
      existing.subtotal = existing.subtotal.add(item.subtotal);
    } else {
      topProductMap.set(item.productId, {
        productId: item.productId,
        name: item.productNameSnapshot,
        unitName: item.unitNameSnapshot,
        quantity: item.quantity,
        subtotal: item.subtotal,
      });
    }
  }

  const topProducts = Array.from(topProductMap.values())
    .sort((first, second) => second.subtotal.comparedTo(first.subtotal))
    .slice(0, 5);

  const dailyPerformanceMap = new Map(
    dailyRanges.map((range) => [
      range.key,
      {
        dateKey: range.key,
        label: range.label,
        salesTotal: new Prisma.Decimal(0),
        grossProfit: new Prisma.Decimal(0),
      },
    ]),
  );

  for (const sale of chartSales) {
    const dailyPerformance = dailyPerformanceMap.get(getJakartaDateKey(sale.saleDate));
    if (!dailyPerformance) continue;
    dailyPerformance.salesTotal = dailyPerformance.salesTotal.add(sale.grandTotal);
    dailyPerformance.grossProfit = dailyPerformance.grossProfit.add(sale.grossProfit);
  }

  return {
    summary: {
      salesTotal: todaySales.reduce((total, sale) => total.add(sale.grandTotal), zero),
      salesWeekTotal: weekSales.reduce((total, sale) => total.add(sale.grandTotal), zero),
      salesMonthTotal: monthSales.reduce((total, sale) => total.add(sale.grandTotal), zero),
      transactionCount: todaySales.length,
      grossProfit: todaySales.reduce((total, sale) => total.add(sale.grossProfit), zero),
      expenseTotal: todayExpenses.reduce((total, expense) => total.add(expense.amount), zero),
      purchaseMonthTotal: monthPurchases.reduce((total, purchase) => total.add(purchase.grandTotal), zero),
      supplierDebtTotal: debtPurchases.reduce((total, purchase) => total.add(purchase.remainingDebt), zero),
      lowStockCount: products.filter((product) => product.currentStock.lessThanOrEqualTo(product.minimumStock)).length,
      openSessionCount: openSessions,
    },
    dailyPerformance: Array.from(dailyPerformanceMap.values()),
    recentSales,
    topProducts,
    lowStockProducts,
  };
}
