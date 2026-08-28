import "server-only";

import { db } from "@/lib/db";
import { requireOwner } from "@/server/services/authorization";
import type { ProductUnitFormInput } from "@/server/validations/product-unit";

export class ProductUnitServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductUnitServiceError";
  }
}

function normalizeUnitName(value: string) {
  return value.trim().toUpperCase();
}

function normalizeProductUnitInput(input: ProductUnitFormInput) {
  return {
    productId: input.productId,
    unitName: normalizeUnitName(input.unitName),
    conversionToBase: input.conversionToBase,
    sellingPrice: input.sellingPrice,
    wholesalePrice: input.wholesalePrice || null,
    barcode: input.barcode || null,
    isBaseUnit: input.isBaseUnit,
    isActive: input.isActive,
  };
}

async function getProductOrThrow(productId: string) {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, baseUnitName: true },
  });

  if (!product) {
    throw new ProductUnitServiceError("Produk tidak ditemukan.");
  }

  return product;
}

async function ensureUnitNameAvailable(productId: string, unitName: string, excludedId?: string) {
  const duplicate = await db.productUnit.findFirst({
    where: {
      productId,
      unitName: normalizeUnitName(unitName),
      ...(excludedId ? { id: { not: excludedId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new ProductUnitServiceError("Nama satuan sudah digunakan untuk produk ini.");
  }
}

async function validateBaseUnitRules(
  input: ProductUnitFormInput,
  product: { baseUnitName: string },
  existingId?: string,
) {
  const normalizedName = normalizeUnitName(input.unitName);

  if (input.isBaseUnit) {
    if (Number(input.conversionToBase) !== 1) {
      throw new ProductUnitServiceError("Konversi satuan dasar harus bernilai 1.");
    }

    if (normalizedName !== normalizeUnitName(product.baseUnitName)) {
      throw new ProductUnitServiceError(
        `Nama satuan dasar harus sama dengan satuan dasar produk: ${product.baseUnitName}.`,
      );
    }

    if (!input.isActive) {
      throw new ProductUnitServiceError("Satuan dasar harus berstatus aktif.");
    }

    return;
  }

  const activeBaseUnit = await db.productUnit.findFirst({
    where: {
      productId: input.productId,
      isBaseUnit: true,
      isActive: true,
      ...(existingId ? { id: { not: existingId } } : {}),
    },
    select: { id: true },
  });

  if (!activeBaseUnit) {
    throw new ProductUnitServiceError("Buat satuan dasar produk terlebih dahulu.");
  }
}

export async function listProductUnits() {
  await requireOwner();

  return db.productUnit.findMany({
    orderBy: [
      { product: { name: "asc" } },
      { isBaseUnit: "desc" },
      { unitName: "asc" },
    ],
    select: {
      id: true,
      unitName: true,
      conversionToBase: true,
      sellingPrice: true,
      wholesalePrice: true,
      barcode: true,
      isBaseUnit: true,
      isActive: true,
      product: { select: { id: true, productCode: true, name: true, baseUnitName: true } },
    },
  });
}

export async function listProductOptionsForUnits() {
  await requireOwner();

  return db.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, productCode: true, name: true, baseUnitName: true, isActive: true },
  });
}

export async function getProductUnitForEdit(id: string) {
  await requireOwner();

  return db.productUnit.findUnique({
    where: { id },
    select: {
      id: true,
      productId: true,
      unitName: true,
      conversionToBase: true,
      sellingPrice: true,
      wholesalePrice: true,
      barcode: true,
      isBaseUnit: true,
      isActive: true,
    },
  });
}

export async function createProductUnit(input: ProductUnitFormInput) {
  await requireOwner();
  const product = await getProductOrThrow(input.productId);

  await Promise.all([
    ensureUnitNameAvailable(input.productId, input.unitName),
    validateBaseUnitRules(input, product),
  ]);

  await db.$transaction(async (transaction) => {
    if (input.isBaseUnit) {
      await transaction.productUnit.updateMany({
        where: { productId: input.productId, isBaseUnit: true },
        data: { isBaseUnit: false },
      });
    }

    await transaction.productUnit.create({ data: normalizeProductUnitInput(input) });
  });
}

export async function updateProductUnit(id: string, input: ProductUnitFormInput) {
  await requireOwner();

  const existing = await db.productUnit.findUnique({
    where: { id },
    select: { id: true, productId: true, isBaseUnit: true },
  });

  if (!existing) {
    throw new ProductUnitServiceError("Satuan produk tidak ditemukan.");
  }

  if (existing.productId !== input.productId) {
    throw new ProductUnitServiceError("Produk pada satuan tidak dapat diubah.");
  }

  const product = await getProductOrThrow(input.productId);
  await Promise.all([
    ensureUnitNameAvailable(input.productId, input.unitName, id),
    validateBaseUnitRules(input, product, id),
  ]);

  await db.$transaction(async (transaction) => {
    if (input.isBaseUnit) {
      await transaction.productUnit.updateMany({
        where: { productId: input.productId, isBaseUnit: true, id: { not: id } },
        data: { isBaseUnit: false },
      });
    }

    await transaction.productUnit.update({
      where: { id },
      data: normalizeProductUnitInput(input),
    });
  });
}

export async function archiveProductUnit(id: string) {
  await requireOwner();

  const unit = await db.productUnit.findUnique({
    where: { id },
    select: { id: true, isBaseUnit: true },
  });

  if (!unit) {
    throw new ProductUnitServiceError("Satuan produk tidak ditemukan.");
  }

  if (unit.isBaseUnit) {
    throw new ProductUnitServiceError("Satuan dasar tidak dapat dinonaktifkan.");
  }

  await db.productUnit.update({ where: { id }, data: { isActive: false } });
}
