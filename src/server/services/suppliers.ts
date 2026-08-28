import "server-only";

import { db } from "@/lib/db";
import { getNextSupplierCode } from "@/lib/supplier-code";
import { requireOwner } from "@/server/services/authorization";
import type { SupplierFormInput } from "@/server/validations/supplier";

export class SupplierServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupplierServiceError";
  }
}

function normalizeSupplierInput(input: SupplierFormInput) {
  return {
    name: input.name,
    contactPerson: input.contactPerson || null,
    phone: input.phone || null,
    email: input.email?.toLowerCase() || null,
    address: input.address || null,
    notes: input.notes || null,
    isActive: input.isActive,
  };
}

function isRetryableTransactionError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return error.code === "P2002" || error.code === "P2034";
}

export async function listSuppliers() {
  await requireOwner();

  return db.supplier.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      supplierCode: true,
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      address: true,
      isActive: true,
    },
  });
}

export async function getSupplierForEdit(id: string) {
  await requireOwner();

  return db.supplier.findUnique({
    where: { id },
    select: {
      id: true,
      supplierCode: true,
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      address: true,
      notes: true,
      isActive: true,
    },
  });
}

export async function createSupplier(input: SupplierFormInput) {
  await requireOwner();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await db.$transaction(
        async (transaction) => {
          const suppliers = await transaction.supplier.findMany({
            where: { supplierCode: { startsWith: "SUP-" } },
            select: { supplierCode: true },
          });
          const supplierCode = getNextSupplierCode(
            suppliers.map((supplier) => supplier.supplierCode),
          );

          await transaction.supplier.create({
            data: { supplierCode, ...normalizeSupplierInput(input) },
          });
        },
        { isolationLevel: "Serializable" },
      );
      return;
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) {
        continue;
      }
      throw error;
    }
  }
}

export async function updateSupplier(id: string, input: SupplierFormInput) {
  await requireOwner();

  const result = await db.supplier.updateMany({
    where: { id },
    data: normalizeSupplierInput(input),
  });

  if (result.count === 0) {
    throw new SupplierServiceError("Supplier tidak ditemukan.");
  }
}

export async function archiveSupplier(id: string) {
  await requireOwner();

  const result = await db.supplier.updateMany({
    where: { id },
    data: { isActive: false },
  });

  if (result.count === 0) {
    throw new SupplierServiceError("Supplier tidak ditemukan.");
  }
}
