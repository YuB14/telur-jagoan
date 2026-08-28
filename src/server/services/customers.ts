import "server-only";

import { DEFAULT_CUSTOMER_CODE, getNextCustomerCode } from "@/lib/customer-code";
import { db } from "@/lib/db";
import { requireOwner } from "@/server/services/authorization";
import type { CustomerFormInput } from "@/server/validations/customer";

export class CustomerServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerServiceError";
  }
}

function normalizeCustomerInput(input: CustomerFormInput) {
  return {
    name: input.name,
    phone: input.phone || null,
    address: input.address || null,
    customerType: input.customerType,
    isActive: input.isActive,
  };
}

function isRetryableTransactionError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return error.code === "P2002" || error.code === "P2034";
}

export async function listCustomers() {
  await requireOwner();

  const customers = await db.customer.findMany({
    orderBy: [{ customerCode: "asc" }],
    select: {
      id: true,
      customerCode: true,
      name: true,
      phone: true,
      address: true,
      customerType: true,
      isActive: true,
    },
  });

  return customers.map((customer) => ({
    ...customer,
    isDefault: customer.customerCode === DEFAULT_CUSTOMER_CODE,
  }));
}

export async function getCustomerForEdit(id: string) {
  await requireOwner();

  const customer = await db.customer.findUnique({
    where: { id },
    select: {
      id: true,
      customerCode: true,
      name: true,
      phone: true,
      address: true,
      customerType: true,
      isActive: true,
    },
  });

  if (customer?.customerCode === DEFAULT_CUSTOMER_CODE) {
    throw new CustomerServiceError("Pelanggan Umum adalah data sistem dan tidak dapat diedit.");
  }

  return customer;
}

export async function createCustomer(input: CustomerFormInput) {
  await requireOwner();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await db.$transaction(
        async (transaction) => {
          const customers = await transaction.customer.findMany({
            where: { customerCode: { startsWith: "CUS-" } },
            select: { customerCode: true },
          });
          const customerCode = getNextCustomerCode(
            customers.map((customer) => customer.customerCode),
          );

          await transaction.customer.create({
            data: { customerCode, ...normalizeCustomerInput(input) },
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

export async function updateCustomer(id: string, input: CustomerFormInput) {
  await requireOwner();

  const existing = await db.customer.findUnique({
    where: { id },
    select: { id: true, customerCode: true },
  });

  if (!existing) {
    throw new CustomerServiceError("Pelanggan tidak ditemukan.");
  }

  if (existing.customerCode === DEFAULT_CUSTOMER_CODE) {
    throw new CustomerServiceError("Pelanggan Umum adalah data sistem dan tidak dapat diedit.");
  }

  await db.customer.update({
    where: { id },
    data: normalizeCustomerInput(input),
  });
}

export async function archiveCustomer(id: string) {
  await requireOwner();

  const existing = await db.customer.findUnique({
    where: { id },
    select: { id: true, customerCode: true },
  });

  if (!existing) {
    throw new CustomerServiceError("Pelanggan tidak ditemukan.");
  }

  if (existing.customerCode === DEFAULT_CUSTOMER_CODE) {
    throw new CustomerServiceError("Pelanggan Umum tidak dapat dinonaktifkan.");
  }

  await db.customer.update({ where: { id }, data: { isActive: false } });
}
