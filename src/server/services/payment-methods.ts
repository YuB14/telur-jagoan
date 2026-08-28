import "server-only";

import { db } from "@/lib/db";
import { requireOwner } from "@/server/services/authorization";
import type { PaymentMethodFormInput } from "@/server/validations/payment-method";

export class PaymentMethodServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentMethodServiceError";
  }
}

function normalizePaymentMethodInput(input: PaymentMethodFormInput) {
  return {
    code: input.code.toUpperCase(),
    name: input.name,
    type: input.type,
    isActive: input.isActive,
  };
}

async function ensureCodeAvailable(code: string, excludedId?: string) {
  const duplicate = await db.paymentMethod.findFirst({
    where: {
      code: code.toUpperCase(),
      ...(excludedId ? { id: { not: excludedId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new PaymentMethodServiceError("Kode metode pembayaran sudah digunakan.");
  }
}

export async function listPaymentMethods() {
  await requireOwner();

  return db.paymentMethod.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      isActive: true,
    },
  });
}

export async function getPaymentMethodForEdit(id: string) {
  await requireOwner();

  return db.paymentMethod.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      isActive: true,
    },
  });
}

export async function createPaymentMethod(input: PaymentMethodFormInput) {
  await requireOwner();
  await ensureCodeAvailable(input.code);

  await db.paymentMethod.create({ data: normalizePaymentMethodInput(input) });
}

export async function updatePaymentMethod(id: string, input: PaymentMethodFormInput) {
  await requireOwner();

  const existing = await db.paymentMethod.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new PaymentMethodServiceError("Metode pembayaran tidak ditemukan.");
  }

  await ensureCodeAvailable(input.code, id);
  await db.paymentMethod.update({
    where: { id },
    data: normalizePaymentMethodInput(input),
  });
}

export async function archivePaymentMethod(id: string) {
  await requireOwner();

  const result = await db.paymentMethod.updateMany({
    where: { id },
    data: { isActive: false },
  });

  if (result.count === 0) {
    throw new PaymentMethodServiceError("Metode pembayaran tidak ditemukan.");
  }
}
