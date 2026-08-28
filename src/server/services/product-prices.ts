import "server-only";

import { db } from "@/lib/db";
import { requireOwner } from "@/server/services/authorization";
import type { ProductPriceFormInput } from "@/server/validations/product-price";

export class ProductPriceServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductPriceServiceError";
  }
}

function isKilogramUnit(baseUnitName: string, unitName: string) {
  const normalizedBaseUnit = baseUnitName.trim().toUpperCase();
  const normalizedUnit = unitName.trim().toUpperCase();

  return (
    (normalizedBaseUnit === "KG" || normalizedBaseUnit === "KILOGRAM") &&
    (normalizedUnit === "KG" || normalizedUnit === "KILOGRAM")
  );
}

export async function listProductPrices() {
  await requireOwner();

  const units = await db.productUnit.findMany({
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
      isBaseUnit: true,
      isActive: true,
      product: {
        select: {
          productCode: true,
          name: true,
          baseUnitName: true,
          isActive: true,
        },
      },
    },
  });

  return units.map((unit) => ({
    ...unit,
    isKilogramPrice: isKilogramUnit(unit.product.baseUnitName, unit.unitName),
  }));
}

export async function getProductPriceForEdit(id: string) {
  await requireOwner();

  const unit = await db.productUnit.findUnique({
    where: { id },
    select: {
      id: true,
      unitName: true,
      conversionToBase: true,
      sellingPrice: true,
      wholesalePrice: true,
      isBaseUnit: true,
      isActive: true,
      product: {
        select: {
          productCode: true,
          name: true,
          baseUnitName: true,
          isActive: true,
        },
      },
    },
  });

  if (!unit) {
    return null;
  }

  return {
    ...unit,
    isKilogramPrice: isKilogramUnit(unit.product.baseUnitName, unit.unitName),
  };
}

export async function updateProductPrice(id: string, input: ProductPriceFormInput) {
  await requireOwner();

  const existing = await db.productUnit.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new ProductPriceServiceError("Satuan produk tidak ditemukan.");
  }

  await db.productUnit.update({
    where: { id },
    data: {
      sellingPrice: input.sellingPrice,
      wholesalePrice: input.wholesalePrice || null,
    },
  });
}
