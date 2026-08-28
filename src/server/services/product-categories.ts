import "server-only";

import { db } from "@/lib/db";
import { requireOwner } from "@/server/services/authorization";
import type { ProductCategoryFormInput } from "@/server/validations/product-category";

export class ProductCategoryServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductCategoryServiceError";
  }
}

function normalizeCategoryInput(input: ProductCategoryFormInput) {
  return {
    categoryCode: input.categoryCode.toUpperCase(),
    name: input.name,
    description: null,
    isActive: true,
  };
}

async function ensureCategoryCodeAvailable(categoryCode: string, excludedId?: string) {
  const duplicate = await db.productCategory.findFirst({
    where: {
      categoryCode: categoryCode.toUpperCase(),
      ...(excludedId ? { id: { not: excludedId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new ProductCategoryServiceError("Kode kategori sudah digunakan.");
  }
}

export async function listProductCategories() {
  await requireOwner();

  return db.productCategory.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      categoryCode: true,
      name: true,
      description: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });
}

export async function getProductCategoryForEdit(id: string) {
  await requireOwner();

  return db.productCategory.findUnique({
    where: { id },
    select: {
      id: true,
      categoryCode: true,
      name: true,
      description: true,
      isActive: true,
    },
  });
}

export async function createProductCategory(input: ProductCategoryFormInput) {
  await requireOwner();
  await ensureCategoryCodeAvailable(input.categoryCode);

  await db.productCategory.create({ data: normalizeCategoryInput(input) });
}

export async function updateProductCategory(id: string, input: ProductCategoryFormInput) {
  await requireOwner();

  const existing = await db.productCategory.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new ProductCategoryServiceError("Kategori produk tidak ditemukan.");
  }

  await ensureCategoryCodeAvailable(input.categoryCode, id);
  await db.productCategory.update({
    where: { id },
    data: normalizeCategoryInput(input),
  });
}

export async function archiveProductCategory(id: string) {
  await requireOwner();

  const result = await db.productCategory.updateMany({
    where: { id },
    data: { isActive: false },
  });

  if (result.count === 0) {
    throw new ProductCategoryServiceError("Kategori produk tidak ditemukan.");
  }
}
