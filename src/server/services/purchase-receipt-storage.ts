import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { MAX_PRODUCT_IMAGE_DIMENSION } from "@/lib/product-image";

const LOCAL_RECEIPT_URL_PREFIX = "/uploads/purchase-receipts/";
const MAX_RECEIPT_FILE_SIZE = 5 * 1024 * 1024;

function isEmptyFile(file: File | null | undefined) {
  return !file || file.size === 0;
}

function assertReceiptFile(file: File) {
  if (file.size > MAX_RECEIPT_FILE_SIZE) {
    throw new Error("Bukti pembayaran maksimal 5MB.");
  }

  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)
  ) {
    throw new Error("Bukti pembayaran harus berupa JPG, PNG, WebP, atau PDF.");
  }
}

async function optimizeReceiptImage(file: File) {
  const input = Buffer.from(await file.arrayBuffer());

  try {
    return sharp(input, {
      failOn: "warning",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({
        width: MAX_PRODUCT_IMAGE_DIMENSION,
        height: MAX_PRODUCT_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch {
    throw new Error("File bukti pembayaran rusak atau format gambar tidak valid.");
  }
}

async function saveLocalReceipt(fileName: string, contents: Buffer) {
  const directory = path.join(process.cwd(), "public", "uploads", "purchase-receipts");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName), contents, { flag: "wx" });

  return `${LOCAL_RECEIPT_URL_PREFIX}${fileName}`;
}

export async function savePurchaseReceiptFile(file: File | null | undefined) {
  if (isEmptyFile(file)) return null;
  const receiptFile = file as File;

  assertReceiptFile(receiptFile);

  if (receiptFile.type === "application/pdf") {
    const contents = Buffer.from(await receiptFile.arrayBuffer());
    return saveLocalReceipt(`${randomUUID()}.pdf`, contents);
  }

  const contents = await optimizeReceiptImage(receiptFile);
  return saveLocalReceipt(`${randomUUID()}.webp`, contents);
}
