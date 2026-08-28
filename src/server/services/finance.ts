import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  formatDatedNumber,
  getDatedNumberPrefix,
  getNextDatedSequence,
} from "@/lib/inventory-number";
import { requireOwner } from "@/server/services/authorization";
import type {
  ExpenseCategoryFormInput,
  ExpenseFormInput,
  IncomeFormInput,
} from "@/server/validations/finance";

export class FinanceServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceServiceError";
  }
}

function getDateKey(value = new Date()) {
  return value.toISOString().slice(0, 10).replaceAll("-", "");
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value, (_key, current) => {
    if (current instanceof Prisma.Decimal) return current.toString();
    if (current instanceof Date) return current.toISOString();
    return current;
  })) as Prisma.InputJsonValue;
}

async function getNextExpenseNumber(transaction: Prisma.TransactionClient) {
  const dateKey = getDateKey();
  const prefix = getDatedNumberPrefix("EXP", dateKey);
  const records = await transaction.expense.findMany({
    where: { expenseNumber: { startsWith: prefix } },
    select: { expenseNumber: true },
  });

  return formatDatedNumber(
    "EXP",
    dateKey,
    getNextDatedSequence(records.map((record) => record.expenseNumber), "EXP", dateKey),
  );
}

async function getNextIncomeNumber(transaction: Prisma.TransactionClient) {
  const dateKey = getDateKey();
  const prefix = getDatedNumberPrefix("INC", dateKey);
  const records = await transaction.otherIncome.findMany({
    where: { incomeNumber: { startsWith: prefix } },
    select: { incomeNumber: true },
  });

  return formatDatedNumber(
    "INC",
    dateKey,
    getNextDatedSequence(records.map((record) => record.incomeNumber), "INC", dateKey),
  );
}

async function getOpenCashSession(transaction: Prisma.TransactionClient) {
  return transaction.cashSession.findFirst({
    where: { status: "OPEN" },
    orderBy: { openedAt: "desc" },
    select: { id: true },
  });
}

async function createLinkedCashMovement(
  transaction: Prisma.TransactionClient,
  input: {
    amount: Prisma.Decimal;
    movementType: "CASH_IN" | "CASH_OUT";
    description: string;
    referenceType: "OTHER_INCOME" | "EXPENSE";
    referenceId: string;
    userId: string;
  },
) {
  const openSession = await getOpenCashSession(transaction);
  if (!openSession) return null;

  return transaction.cashMovement.create({
    data: {
      cashSessionId: openSession.id,
      movementType: input.movementType,
      amount: input.amount,
      description: input.description,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdBy: input.userId,
    },
    select: { id: true },
  });
}

async function logActivity(
  transaction: Prisma.TransactionClient,
  input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: unknown;
    newValues?: unknown;
  },
) {
  await transaction.activityLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValues: input.oldValues === undefined ? undefined : toJsonValue(input.oldValues),
      newValues: input.newValues === undefined ? undefined : toJsonValue(input.newValues),
    },
  });
}

export async function listFinanceOptions() {
  await requireOwner();

  const [categories, paymentMethods] = await Promise.all([
    db.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, code: true, name: true },
    }),
    db.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    }),
  ]);

  return { categories, paymentMethods };
}

export async function listFinanceTransactions() {
  await requireOwner();

  const [expenses, incomes] = await Promise.all([
    db.expense.findMany({
      where: { deletedAt: null },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        expenseNumber: true,
        expenseDate: true,
        amount: true,
        description: true,
        category: { select: { name: true } },
        paymentMethod: { select: { name: true, type: true } },
      },
    }),
    db.otherIncome.findMany({
      where: { deletedAt: null },
      orderBy: [{ incomeDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        incomeNumber: true,
        incomeDate: true,
        incomeType: true,
        amount: true,
        description: true,
        paymentMethod: { select: { name: true, type: true } },
      },
    }),
  ]);

  return [
    ...expenses.map((expense) => ({
      id: expense.id,
      type: "EXPENSE" as const,
      number: expense.expenseNumber,
      date: expense.expenseDate,
      label: expense.category.name,
      amount: expense.amount,
      description: expense.description,
      paymentMethod: expense.paymentMethod,
    })),
    ...incomes.map((income) => ({
      id: income.id,
      type: "INCOME" as const,
      number: income.incomeNumber,
      date: income.incomeDate,
      label: income.incomeType,
      amount: income.amount,
      description: income.description,
      paymentMethod: income.paymentMethod,
    })),
  ].sort((first, second) => second.date.getTime() - first.date.getTime());
}

export async function listExpenses() {
  await requireOwner();

  return db.expense.findMany({
    where: { deletedAt: null },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    include: {
      category: { select: { name: true } },
      paymentMethod: { select: { name: true, type: true } },
      cashMovement: { select: { id: true } },
    },
  });
}

export async function listOtherIncomes() {
  await requireOwner();

  return db.otherIncome.findMany({
    where: { deletedAt: null },
    orderBy: [{ incomeDate: "desc" }, { createdAt: "desc" }],
    include: {
      paymentMethod: { select: { name: true, type: true } },
      cashMovement: { select: { id: true } },
    },
  });
}

export async function getExpenseDetail(id: string) {
  await requireOwner();

  return db.expense.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: true,
      paymentMethod: true,
      cashMovement: true,
      creator: { select: { name: true } },
    },
  });
}

export async function getIncomeDetail(id: string) {
  await requireOwner();

  return db.otherIncome.findFirst({
    where: { id, deletedAt: null },
    include: {
      paymentMethod: true,
      cashMovement: true,
      creator: { select: { name: true } },
    },
  });
}

export async function createExpense(input: ExpenseFormInput) {
  const owner = await requireOwner();

  return db.$transaction(async (transaction) => {
    const amount = new Prisma.Decimal(input.amount);
    const expense = await transaction.expense.create({
      data: {
        expenseNumber: await getNextExpenseNumber(transaction),
        expenseDate: input.date,
        amount,
        expenseCategoryId: input.expenseCategoryId,
        paymentMethodId: input.paymentMethodId,
        description: input.description,
        receiptUrl: input.receiptUrl || null,
        createdBy: owner.id,
      },
    });
    const cashMovement = await createLinkedCashMovement(transaction, {
      amount,
      movementType: "CASH_OUT",
      description: `Pengeluaran ${expense.expenseNumber}: ${expense.description}`,
      referenceType: "EXPENSE",
      referenceId: expense.id,
      userId: owner.id,
    });

    if (cashMovement) {
      await transaction.expense.update({
        where: { id: expense.id },
        data: { cashMovementId: cashMovement.id },
      });
    }

    await logActivity(transaction, {
      userId: owner.id,
      action: "CREATE_EXPENSE",
      entityType: "Expense",
      entityId: expense.id,
      newValues: expense,
    });

    return expense;
  });
}

export async function updateExpense(id: string, input: ExpenseFormInput) {
  const owner = await requireOwner();

  return db.$transaction(async (transaction) => {
    const existing = await transaction.expense.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new FinanceServiceError("Pengeluaran tidak ditemukan.");

    const amount = new Prisma.Decimal(input.amount);
    const updated = await transaction.expense.update({
      where: { id },
      data: {
        expenseDate: input.date,
        amount,
        expenseCategoryId: input.expenseCategoryId,
        paymentMethodId: input.paymentMethodId,
        description: input.description,
        receiptUrl: input.receiptUrl || null,
      },
    });

    if (existing.cashMovementId) {
      await transaction.cashMovement.update({
        where: { id: existing.cashMovementId },
        data: {
          amount,
          description: `Pengeluaran ${existing.expenseNumber}: ${input.description}`,
          referenceType: "EXPENSE",
          referenceId: existing.id,
        },
      });
    }

    await logActivity(transaction, {
      userId: owner.id,
      action: "UPDATE_EXPENSE",
      entityType: "Expense",
      entityId: existing.id,
      oldValues: existing,
      newValues: updated,
    });

    return updated;
  });
}

export async function deleteExpense(id: string) {
  const owner = await requireOwner();

  return db.$transaction(async (transaction) => {
    const existing = await transaction.expense.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new FinanceServiceError("Pengeluaran tidak ditemukan.");

    const deleted = await transaction.expense.update({
      where: { id },
      data: { deletedAt: new Date(), cashMovementId: null },
    });

    if (existing.cashMovementId) {
      await transaction.cashMovement.delete({ where: { id: existing.cashMovementId } });
    }

    await logActivity(transaction, {
      userId: owner.id,
      action: "DELETE_EXPENSE",
      entityType: "Expense",
      entityId: existing.id,
      oldValues: existing,
      newValues: deleted,
    });
  });
}

export async function createOtherIncome(input: IncomeFormInput) {
  const owner = await requireOwner();

  return db.$transaction(async (transaction) => {
    const amount = new Prisma.Decimal(input.amount);
    const income = await transaction.otherIncome.create({
      data: {
        incomeNumber: await getNextIncomeNumber(transaction),
        incomeDate: input.date,
        incomeType: input.incomeType,
        amount,
        paymentMethodId: input.paymentMethodId,
        description: input.description,
        createdBy: owner.id,
      },
    });
    const cashMovement = await createLinkedCashMovement(transaction, {
      amount,
      movementType: "CASH_IN",
      description: `Pemasukan ${income.incomeNumber}: ${income.description}`,
      referenceType: "OTHER_INCOME",
      referenceId: income.id,
      userId: owner.id,
    });

    if (cashMovement) {
      await transaction.otherIncome.update({
        where: { id: income.id },
        data: { cashMovementId: cashMovement.id },
      });
    }

    await logActivity(transaction, {
      userId: owner.id,
      action: "CREATE_OTHER_INCOME",
      entityType: "OtherIncome",
      entityId: income.id,
      newValues: income,
    });

    return income;
  });
}

export async function updateOtherIncome(id: string, input: IncomeFormInput) {
  const owner = await requireOwner();

  return db.$transaction(async (transaction) => {
    const existing = await transaction.otherIncome.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new FinanceServiceError("Pemasukan tidak ditemukan.");

    const amount = new Prisma.Decimal(input.amount);
    const updated = await transaction.otherIncome.update({
      where: { id },
      data: {
        incomeDate: input.date,
        incomeType: input.incomeType,
        amount,
        paymentMethodId: input.paymentMethodId,
        description: input.description,
      },
    });

    if (existing.cashMovementId) {
      await transaction.cashMovement.update({
        where: { id: existing.cashMovementId },
        data: {
          amount,
          description: `Pemasukan ${existing.incomeNumber}: ${input.description}`,
          referenceType: "OTHER_INCOME",
          referenceId: existing.id,
        },
      });
    }

    await logActivity(transaction, {
      userId: owner.id,
      action: "UPDATE_OTHER_INCOME",
      entityType: "OtherIncome",
      entityId: existing.id,
      oldValues: existing,
      newValues: updated,
    });

    return updated;
  });
}

export async function deleteOtherIncome(id: string) {
  const owner = await requireOwner();

  return db.$transaction(async (transaction) => {
    const existing = await transaction.otherIncome.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new FinanceServiceError("Pemasukan tidak ditemukan.");

    const deleted = await transaction.otherIncome.update({
      where: { id },
      data: { deletedAt: new Date(), cashMovementId: null },
    });

    if (existing.cashMovementId) {
      await transaction.cashMovement.delete({ where: { id: existing.cashMovementId } });
    }

    await logActivity(transaction, {
      userId: owner.id,
      action: "DELETE_OTHER_INCOME",
      entityType: "OtherIncome",
      entityId: existing.id,
      oldValues: existing,
      newValues: deleted,
    });
  });
}

export async function createExpenseCategory(input: ExpenseCategoryFormInput) {
  const owner = await requireOwner();

  return db.$transaction(async (transaction) => {
    const category = await transaction.expenseCategory.create({
      data: {
        code: input.code.toUpperCase(),
        name: input.name,
        description: input.description || null,
      },
    });
    await logActivity(transaction, {
      userId: owner.id,
      action: "CREATE_EXPENSE_CATEGORY",
      entityType: "ExpenseCategory",
      entityId: category.id,
      newValues: category,
    });
    return category;
  });
}
