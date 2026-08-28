import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireOwner } from "@/server/services/authorization";

export const REPORT_DEFINITIONS = {
  penjualan: "Laporan Penjualan",
  pembelian: "Laporan Pembelian",
  stok: "Laporan Stok",
  "produk-terlaris": "Laporan Produk Terlaris",
  "telur-rusak": "Laporan Telur Rusak",
  "hutang-supplier": "Laporan Hutang Supplier",
  pemasukan: "Laporan Pemasukan",
  pengeluaran: "Laporan Pengeluaran",
  laba: "Laporan Laba",
  "laba-kotor": "Laporan Laba Kotor",
  "laba-bersih": "Laporan Laba Bersih",
  kasir: "Laporan Kasir",
} as const;

export type ReportKey = keyof typeof REPORT_DEFINITIONS;

export type ReportFilter = {
  startDate?: string;
  endDate?: string;
};

export type ReportResult = {
  key: ReportKey;
  title: string;
  startDate: string;
  endDate: string;
  columns: string[];
  rows: Array<Record<string, string>>;
  summary: Record<string, string>;
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function isReportKey(value: string): value is ReportKey {
  return value in REPORT_DEFINITIONS;
}

function getPeriod(filter: ReportFilter) {
  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - 30);

  const start = filter.startDate ? new Date(`${filter.startDate}T00:00:00+07:00`) : defaultStart;
  const end = filter.endDate ? new Date(`${filter.endDate}T23:59:59+07:00`) : today;

  return {
    start,
    end,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function money(value: Prisma.Decimal | number | string) {
  return currencyFormatter.format(Number(value));
}

function decimal(value: Prisma.Decimal | number | string) {
  return decimalFormatter.format(Number(value));
}

function date(value: Date) {
  return dateFormatter.format(value);
}

function sum(values: Array<Prisma.Decimal | number | string>) {
  return values.reduce<Prisma.Decimal>(
    (total, value) => total.add(new Prisma.Decimal(value)),
    new Prisma.Decimal(0),
  );
}

export async function getReportData(key: ReportKey, filter: ReportFilter = {}): Promise<ReportResult> {
  await requireOwner();
  const period = getPeriod(filter);
  const base = {
    key,
    title: REPORT_DEFINITIONS[key],
    startDate: period.startDate,
    endDate: period.endDate,
  };

  if (key === "penjualan") {
    const sales = await db.sale.findMany({
      where: { saleDate: { gte: period.start, lte: period.end } },
      orderBy: [{ saleDate: "desc" }],
      select: {
        saleNumber: true,
        saleDate: true,
        status: true,
        grandTotal: true,
        grossProfit: true,
        cashier: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });
    return {
      ...base,
      columns: ["Nomor", "Tanggal", "Kasir", "Item", "Status", "Total", "Laba Kotor"],
      rows: sales.map((sale) => ({
        Nomor: sale.saleNumber,
        Tanggal: date(sale.saleDate),
        Kasir: sale.cashier.name,
        Item: String(sale._count.items),
        Status: sale.status,
        Total: money(sale.grandTotal),
        "Laba Kotor": money(sale.grossProfit),
      })),
      summary: {
        "Jumlah transaksi": String(sales.length),
        "Total penjualan": money(sum(sales.map((sale) => sale.grandTotal))),
        "Total laba kotor": money(sum(sales.map((sale) => sale.grossProfit))),
      },
    };
  }

  if (key === "pembelian") {
    const purchases = await db.purchase.findMany({
      where: { purchaseDate: { gte: period.start, lte: period.end } },
      orderBy: [{ purchaseDate: "desc" }],
      select: {
        purchaseNumber: true,
        purchaseDate: true,
        supplierName: true,
        paymentStatus: true,
        grandTotal: true,
        remainingDebt: true,
      },
    });
    return {
      ...base,
      columns: ["Nomor", "Tanggal", "Supplier", "Status Bayar", "Total", "Sisa Hutang"],
      rows: purchases.map((purchase) => ({
        Nomor: purchase.purchaseNumber,
        Tanggal: date(purchase.purchaseDate),
        Supplier: purchase.supplierName,
        "Status Bayar": purchase.paymentStatus,
        Total: money(purchase.grandTotal),
        "Sisa Hutang": money(purchase.remainingDebt),
      })),
      summary: {
        "Jumlah pembelian": String(purchases.length),
        "Total pembelian": money(sum(purchases.map((purchase) => purchase.grandTotal))),
        "Total sisa hutang": money(sum(purchases.map((purchase) => purchase.remainingDebt))),
      },
    };
  }

  if (key === "stok") {
    const movements = await db.stockMovement.findMany({
      where: { createdAt: { gte: period.start, lte: period.end } },
      orderBy: [{ createdAt: "desc" }],
      select: {
        movementNumber: true,
        createdAt: true,
        movementType: true,
        quantityIn: true,
        quantityOut: true,
        stockBefore: true,
        stockAfter: true,
        product: { select: { name: true, baseUnitName: true } },
      },
    });
    return {
      ...base,
      columns: ["Nomor", "Tanggal", "Produk", "Jenis", "Masuk", "Keluar", "Stok Sebelum", "Stok Sesudah"],
      rows: movements.map((movement) => ({
        Nomor: movement.movementNumber,
        Tanggal: date(movement.createdAt),
        Produk: movement.product.name,
        Jenis: movement.movementType,
        Masuk: `${decimal(movement.quantityIn)} ${movement.product.baseUnitName}`,
        Keluar: `${decimal(movement.quantityOut)} ${movement.product.baseUnitName}`,
        "Stok Sebelum": decimal(movement.stockBefore),
        "Stok Sesudah": decimal(movement.stockAfter),
      })),
      summary: {
        "Jumlah mutasi": String(movements.length),
        "Total stok masuk": decimal(sum(movements.map((movement) => movement.quantityIn))),
        "Total stok keluar": decimal(sum(movements.map((movement) => movement.quantityOut))),
      },
    };
  }

  if (key === "produk-terlaris") {
    const items = await db.saleItem.findMany({
      where: { sale: { saleDate: { gte: period.start, lte: period.end }, status: { not: "CANCELLED" } } },
      select: {
        productId: true,
        productNameSnapshot: true,
        baseQuantity: true,
        subtotal: true,
        product: { select: { baseUnitName: true } },
      },
    });
    const grouped = new Map<string, { product: string; unit: string; quantity: Prisma.Decimal; total: Prisma.Decimal }>();
    for (const item of items) {
      const current = grouped.get(item.productId) ?? {
        product: item.productNameSnapshot,
        unit: item.product.baseUnitName,
        quantity: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0),
      };
      current.quantity = current.quantity.add(item.baseQuantity);
      current.total = current.total.add(item.subtotal);
      grouped.set(item.productId, current);
    }
    const rows = [...grouped.values()].sort((a, b) => Number(b.quantity.sub(a.quantity)));
    return {
      ...base,
      columns: ["Produk", "Qty Terjual", "Total Penjualan"],
      rows: rows.map((row) => ({
        Produk: row.product,
        "Qty Terjual": `${decimal(row.quantity)} ${row.unit}`,
        "Total Penjualan": money(row.total),
      })),
      summary: { "Jumlah produk terjual": String(rows.length), "Total omzet": money(sum(rows.map((row) => row.total))) },
    };
  }

  if (key === "telur-rusak") {
    const damages = await db.stockDamage.findMany({
      where: { damageDate: { gte: period.start, lte: period.end } },
      orderBy: [{ damageDate: "desc" }],
      select: {
        damageNumber: true,
        damageDate: true,
        damageType: true,
        quantity: true,
        lossAmount: true,
        product: { select: { name: true, baseUnitName: true } },
      },
    });
    return {
      ...base,
      columns: ["Nomor", "Tanggal", "Produk", "Jenis", "Jumlah", "Nilai Kerugian"],
      rows: damages.map((damage) => ({
        Nomor: damage.damageNumber,
        Tanggal: date(damage.damageDate),
        Produk: damage.product.name,
        Jenis: damage.damageType,
        Jumlah: `${decimal(damage.quantity)} ${damage.product.baseUnitName}`,
        "Nilai Kerugian": money(damage.lossAmount),
      })),
      summary: {
        "Jumlah catatan": String(damages.length),
        "Total kerugian": money(sum(damages.map((damage) => damage.lossAmount))),
      },
    };
  }

  if (key === "hutang-supplier") {
    const debts = await db.purchase.findMany({
      where: {
        purchaseDate: { gte: period.start, lte: period.end },
        paymentStatus: { in: ["UNPAID", "PARTIAL"] },
        remainingDebt: { gt: 0 },
      },
      orderBy: [{ dueDate: "asc" }],
      select: {
        purchaseNumber: true,
        purchaseDate: true,
        dueDate: true,
        supplierName: true,
        grandTotal: true,
        amountPaid: true,
        remainingDebt: true,
      },
    });
    return {
      ...base,
      columns: ["Nomor", "Tanggal", "Jatuh Tempo", "Supplier", "Total", "Dibayar", "Sisa Hutang"],
      rows: debts.map((debt) => ({
        Nomor: debt.purchaseNumber,
        Tanggal: date(debt.purchaseDate),
        "Jatuh Tempo": debt.dueDate ? date(debt.dueDate) : "-",
        Supplier: debt.supplierName,
        Total: money(debt.grandTotal),
        Dibayar: money(debt.amountPaid),
        "Sisa Hutang": money(debt.remainingDebt),
      })),
      summary: { "Jumlah hutang": String(debts.length), "Total sisa hutang": money(sum(debts.map((debt) => debt.remainingDebt))) },
    };
  }

  if (key === "pemasukan") {
    const incomes = await db.otherIncome.findMany({
      where: { deletedAt: null, incomeDate: { gte: period.start, lte: period.end } },
      orderBy: [{ incomeDate: "desc" }],
      select: { incomeNumber: true, incomeDate: true, incomeType: true, amount: true, paymentMethod: { select: { name: true } }, description: true },
    });
    return {
      ...base,
      columns: ["Nomor", "Tanggal", "Jenis", "Metode", "Nominal", "Keterangan"],
      rows: incomes.map((income) => ({
        Nomor: income.incomeNumber,
        Tanggal: date(income.incomeDate),
        Jenis: income.incomeType,
        Metode: income.paymentMethod.name,
        Nominal: money(income.amount),
        Keterangan: income.description,
      })),
      summary: { "Jumlah pemasukan": String(incomes.length), "Total pemasukan": money(sum(incomes.map((income) => income.amount))) },
    };
  }

  if (key === "pengeluaran") {
    const expenses = await db.expense.findMany({
      where: { deletedAt: null, expenseDate: { gte: period.start, lte: period.end } },
      orderBy: [{ expenseDate: "desc" }],
      select: { expenseNumber: true, expenseDate: true, amount: true, description: true, category: { select: { name: true } }, paymentMethod: { select: { name: true } } },
    });
    return {
      ...base,
      columns: ["Nomor", "Tanggal", "Kategori", "Metode", "Nominal", "Keterangan"],
      rows: expenses.map((expense) => ({
        Nomor: expense.expenseNumber,
        Tanggal: date(expense.expenseDate),
        Kategori: expense.category.name,
        Metode: expense.paymentMethod.name,
        Nominal: money(expense.amount),
        Keterangan: expense.description,
      })),
      summary: { "Jumlah pengeluaran": String(expenses.length), "Total pengeluaran": money(sum(expenses.map((expense) => expense.amount))) },
    };
  }

  if (key === "laba" || key === "laba-kotor" || key === "laba-bersih") {
    const [sales, expenses, damages] = await Promise.all([
      db.sale.findMany({ where: { saleDate: { gte: period.start, lte: period.end }, status: { not: "CANCELLED" } }, select: { saleNumber: true, saleDate: true, grandTotal: true, totalCost: true, grossProfit: true } }),
      db.expense.findMany({ where: { deletedAt: null, expenseDate: { gte: period.start, lte: period.end } }, select: { amount: true } }),
      db.stockDamage.findMany({ where: { damageDate: { gte: period.start, lte: period.end } }, select: { lossAmount: true } }),
    ]);
    const grossProfit = sum(sales.map((sale) => sale.grossProfit));
    const expenseTotal = sum(expenses.map((expense) => expense.amount));
    const damageTotal = sum(damages.map((damage) => damage.lossAmount));
    const netProfit = grossProfit.sub(expenseTotal).sub(damageTotal);
    return {
      ...base,
      columns: key === "laba-kotor"
        ? ["Nomor Penjualan", "Tanggal", "Omzet", "HPP", "Laba Kotor"]
        : ["Komponen", "Nominal"],
      rows: key === "laba-kotor"
        ? sales.map((sale) => ({ "Nomor Penjualan": sale.saleNumber, Tanggal: date(sale.saleDate), Omzet: money(sale.grandTotal), HPP: money(sale.totalCost), "Laba Kotor": money(sale.grossProfit) }))
        : [
          { Komponen: "Laba Kotor", Nominal: money(grossProfit) },
          { Komponen: "Pengeluaran Operasional", Nominal: money(expenseTotal) },
          { Komponen: "Kerugian Stok Rusak", Nominal: money(damageTotal) },
          { Komponen: "Laba Bersih", Nominal: money(netProfit) },
        ],
      summary: key === "laba-kotor"
        ? { "Total laba kotor": money(grossProfit), "Jumlah penjualan": String(sales.length) }
        : { "Laba bersih": money(netProfit), "Laba kotor": money(grossProfit), Pengeluaran: money(expenseTotal), "Kerugian stok": money(damageTotal) },
    };
  }

  const sessions = await db.cashSession.findMany({
    where: { openedAt: { gte: period.start, lte: period.end } },
    orderBy: [{ openedAt: "desc" }],
    select: {
      sessionNumber: true,
      openedAt: true,
      closedAt: true,
      openingCash: true,
      expectedCash: true,
      actualCash: true,
      cashDifference: true,
      status: true,
      cashier: { select: { name: true } },
      sales: { select: { grandTotal: true } },
    },
  });
  return {
    ...base,
    columns: ["Sesi", "Kasir", "Dibuka", "Ditutup", "Status", "Penjualan", "Modal Awal", "Kas Seharusnya", "Kas Fisik", "Selisih"],
    rows: sessions.map((session) => ({
      Sesi: session.sessionNumber,
      Kasir: session.cashier.name,
      Dibuka: date(session.openedAt),
      Ditutup: session.closedAt ? date(session.closedAt) : "-",
      Status: session.status,
      Penjualan: money(sum(session.sales.map((sale) => sale.grandTotal))),
      "Modal Awal": money(session.openingCash),
      "Kas Seharusnya": session.expectedCash ? money(session.expectedCash) : "-",
      "Kas Fisik": session.actualCash ? money(session.actualCash) : "-",
      Selisih: session.cashDifference ? money(session.cashDifference) : "-",
    })),
    summary: { "Jumlah sesi": String(sessions.length), "Total penjualan": money(sum(sessions.flatMap((session) => session.sales.map((sale) => sale.grandTotal)))) },
  };
}
