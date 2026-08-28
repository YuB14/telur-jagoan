import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  formatDatedNumber,
  getDatedNumberPrefix,
  getNextDatedSequence,
} from "@/lib/inventory-number";
import { requireOwner } from "@/server/services/authorization";
import {
  deleteProductImage,
  saveProductImage,
} from "@/server/services/product-image-storage";
import type { ProductDamageFormInput, ProductFormInput } from "@/server/validations/product";

export class ProductServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductServiceError";
  }
}

function normalizeProductInput(input: ProductFormInput) {
  return {
    productCode: input.productCode.toUpperCase(),
    categoryId: input.categoryId || null,
    name: input.name,
    description: input.description || null,
    baseUnitName: "Kg",
    minimumStock: 0,
    isFeatured: false,
    isActive: input.isActive,
  };
}

async function ensureCategoryExists(categoryId: string | undefined) {
  if (!categoryId) {
    return;
  }

  const category = await db.productCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });

  if (!category) {
    throw new ProductServiceError("Kategori produk tidak ditemukan.");
  }
}

async function ensureProductCodeAvailable(productCode: string, excludedId?: string) {
  const duplicate = await db.product.findFirst({
    where: {
      productCode: productCode.toUpperCase(),
      ...(excludedId ? { id: { not: excludedId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new ProductServiceError("Kode produk sudah digunakan.");
  }
}

export async function listProducts() {
  await requireOwner();

  return db.product.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      productCode: true,
      barcode: true,
      imageUrl: true,
      name: true,
      baseUnitName: true,
      minimumStock: true,
      currentStock: true,
      isFeatured: true,
      isActive: true,
      category: { select: { name: true } },
      units: {
        where: { isBaseUnit: true, unitName: "Kg" },
        select: { sellingPrice: true },
        take: 1,
      },
    },
  });
}

export async function listProductCategoryOptions() {
  await requireOwner();

  return db.productCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true },
  });
}

export async function getProductForEdit(id: string) {
  await requireOwner();

  return db.product.findUnique({
    where: { id },
    select: {
      id: true,
      productCode: true,
      categoryId: true,
      name: true,
      description: true,
      imageUrl: true,
      baseUnitName: true,
      minimumStock: true,
      isFeatured: true,
      isActive: true,
      units: {
        where: { isBaseUnit: true, unitName: "Kg" },
        select: { sellingPrice: true },
        take: 1,
      },
    },
  });
}

async function storeImage(file: File) {
  try {
    return await saveProductImage(file);
  } catch (error) {
    throw new ProductServiceError(
      error instanceof Error ? error.message : "Gambar produk belum dapat disimpan.",
    );
  }
}

async function removeStoredImage(imageUrl: string | null | undefined) {
  try {
    await deleteProductImage(imageUrl);
  } catch (error) {
    console.error("Gagal membersihkan gambar produk:", error);
  }
}

export async function createProduct(input: ProductFormInput, imageFile?: File) {
  await requireOwner();
  await Promise.all([
    ensureCategoryExists(input.categoryId),
    ensureProductCodeAvailable(input.productCode),
  ]);

  const imageUrl = imageFile ? await storeImage(imageFile) : null;

  try {
    await db.$transaction(async (transaction) => {
      await transaction.product.create({
        data: {
          ...normalizeProductInput(input),
          imageUrl,
          currentStock: 0,
          units: {
            create: {
              unitName: "Kg",
              conversionToBase: 1,
              sellingPrice: input.pricePerKg,
              wholesalePrice: null,
              barcode: null,
              isBaseUnit: true,
              isActive: true,
            },
          },
        },
      });
    });
  } catch (error) {
    await removeStoredImage(imageUrl);
    throw error;
  }
}

export async function updateProduct(
  id: string,
  input: ProductFormInput,
  imageFile?: File,
  removeImage = false,
) {
  await requireOwner();

  const existing = await db.product.findUnique({
    where: { id },
    select: {
      id: true,
      imageUrl: true,
      units: { where: { isBaseUnit: true, unitName: "Kg" }, select: { id: true }, take: 1 },
    },
  });

  if (!existing) {
    throw new ProductServiceError("Produk tidak ditemukan.");
  }

  await Promise.all([
    ensureCategoryExists(input.categoryId),
    ensureProductCodeAvailable(input.productCode, id),
  ]);

  const uploadedImageUrl = imageFile ? await storeImage(imageFile) : undefined;
  const nextImageUrl = uploadedImageUrl ?? (removeImage ? null : existing.imageUrl);

  try {
    await db.$transaction(async (transaction) => {
      await transaction.product.update({
        where: { id },
        data: { ...normalizeProductInput(input), imageUrl: nextImageUrl },
      });

      const existingKgUnit = existing.units[0];
      if (existingKgUnit) {
        await transaction.productUnit.update({
          where: { id: existingKgUnit.id },
          data: {
            unitName: "Kg",
            conversionToBase: 1,
            sellingPrice: input.pricePerKg,
            isBaseUnit: true,
            isActive: true,
          },
        });
      } else {
        await transaction.productUnit.create({
          data: {
            productId: id,
            unitName: "Kg",
            conversionToBase: 1,
            sellingPrice: input.pricePerKg,
            wholesalePrice: null,
            barcode: null,
            isBaseUnit: true,
            isActive: true,
          },
        });
      }
    });
  } catch (error) {
    await removeStoredImage(uploadedImageUrl);
    throw error;
  }

  if (existing.imageUrl && existing.imageUrl !== nextImageUrl) {
    await removeStoredImage(existing.imageUrl);
  }
}

export async function getProductDetail(id: string) {
  await requireOwner();

  return db.product.findUnique({
    where: { id },
    select: {
      id: true,
      productCode: true,
      name: true,
      description: true,
      imageUrl: true,
      currentStock: true,
      isActive: true,
      category: { select: { name: true } },
      units: {
        where: { isBaseUnit: true, unitName: "Kg" },
        select: { sellingPrice: true },
        take: 1,
      },
      inventoryBatches: {
        orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          batchNumber: true,
          receivedDate: true,
          expiryDate: true,
          initialQuantity: true,
          remainingQuantity: true,
          baseUnitCost: true,
          status: true,
        },
      },
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          movementNumber: true,
          movementType: true,
          quantityIn: true,
          quantityOut: true,
          stockBefore: true,
          stockAfter: true,
          description: true,
          createdAt: true,
        },
      },
    },
  });
}

function getJakartaDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).replaceAll("-", "");
}

export async function recordProductDamage(id: string, input: ProductDamageFormInput) {
  const owner = await requireOwner();
  const requestedQuantity = new Prisma.Decimal(input.quantity);

  return db.$transaction(
    async (transaction) => {
      const product = await transaction.product.findUnique({
        where: { id },
        select: { id: true, name: true, currentStock: true },
      });
      if (!product) throw new ProductServiceError("Produk tidak ditemukan.");
      if (requestedQuantity.greaterThan(product.currentStock)) {
        throw new ProductServiceError("Jumlah rusak melebihi stok produk.");
      }

      const batches = await transaction.inventoryBatch.findMany({
        where: {
          productId: id,
          remainingQuantity: { gt: 0 },
          status: "ACTIVE",
        },
        orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          remainingQuantity: true,
          baseUnitCost: true,
        },
      });

      let quantityLeft = requestedQuantity;
      let productStock = product.currentStock;
      let totalLoss = new Prisma.Decimal(0);
      const dateKey = getJakartaDateKey();
      const damagePrefix = getDatedNumberPrefix("DMG", dateKey);
      const movementPrefix = getDatedNumberPrefix("STK", dateKey);
      const [damageNumbers, movementNumbers] = await Promise.all([
        transaction.stockDamage.findMany({
          where: { damageNumber: { startsWith: damagePrefix } },
          select: { damageNumber: true },
        }),
        transaction.stockMovement.findMany({
          where: { movementNumber: { startsWith: movementPrefix } },
          select: { movementNumber: true },
        }),
      ]);
      let nextDamageSequence = getNextDatedSequence(
        damageNumbers.map((damage) => damage.damageNumber),
        "DMG",
        dateKey,
      );
      let nextMovementSequence = getNextDatedSequence(
        movementNumbers.map((movement) => movement.movementNumber),
        "STK",
        dateKey,
      );

      for (const batch of batches) {
        if (quantityLeft.lessThanOrEqualTo(0)) break;

        const quantity = Prisma.Decimal.min(quantityLeft, batch.remainingQuantity);
        const stockBefore = productStock;
        const stockAfter = stockBefore.sub(quantity);
        const lossAmount = quantity.mul(batch.baseUnitCost);
        totalLoss = totalLoss.add(lossAmount);

        const damage = await transaction.stockDamage.create({
          data: {
            damageNumber: formatDatedNumber("DMG", dateKey, nextDamageSequence),
            productId: id,
            inventoryBatchId: batch.id,
            damageDate: new Date(),
            damageType: input.damageType,
            quantity,
            unitCost: batch.baseUnitCost,
            lossAmount,
            notes: input.notes || null,
            createdBy: owner.id,
          },
          select: { id: true },
        });
        nextDamageSequence += 1;

        await transaction.inventoryBatch.update({
          where: { id: batch.id },
          data: {
            remainingQuantity: { decrement: quantity },
            status: batch.remainingQuantity.equals(quantity) ? "DEPLETED" : "ACTIVE",
          },
        });
        await transaction.product.update({
          where: { id },
          data: { currentStock: stockAfter },
        });
        await transaction.stockMovement.create({
          data: {
            movementNumber: formatDatedNumber("STK", dateKey, nextMovementSequence),
            productId: id,
            inventoryBatchId: batch.id,
            movementType: "DAMAGE",
            quantityIn: 0,
            quantityOut: quantity,
            stockBefore,
            stockAfter,
            referenceType: "STOCK_DAMAGE",
            referenceId: damage.id,
            description: `Kerusakan ${product.name}`,
            createdBy: owner.id,
          },
        });
        nextMovementSequence += 1;
        productStock = stockAfter;
        quantityLeft = quantityLeft.sub(quantity);
      }

      if (quantityLeft.greaterThan(0)) {
        throw new ProductServiceError("Batch aktif tidak mencukupi untuk mencatat kerusakan.");
      }

      return {
        productName: product.name,
        quantity: requestedQuantity.toString(),
        lossAmount: totalLoss.toString(),
      };
    },
    { isolationLevel: "Serializable" },
  );
}

export async function archiveProduct(id: string) {
  await requireOwner();

  const result = await db.product.updateMany({
    where: { id },
    data: { isActive: false },
  });

  if (result.count === 0) {
    throw new ProductServiceError("Produk tidak ditemukan.");
  }
}
