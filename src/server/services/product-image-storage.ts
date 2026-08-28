import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

import {
  MAX_PRODUCT_IMAGE_DIMENSION,
} from "@/lib/product-image";
import { productImageFileSchema } from "@/server/validations/product";

const LOCAL_IMAGE_URL_PREFIX = "/uploads/products/";
const PRODUCT_IMAGE_KEY_PREFIX = "products/";

type S3StorageConfig = {
  endpoint: string;
  region: string;
  bucketName: string;
  publicUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function getStorageDriver() {
  const configuredDriver = process.env.STORAGE_DRIVER?.trim().toLowerCase();

  if (configuredDriver === "local" || configuredDriver === "s3") {
    return configuredDriver;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("STORAGE_DRIVER wajib diatur ke s3 pada production.");
  }

  return "local";
}

function getS3StorageConfig(): S3StorageConfig {
  const config = {
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.STORAGE_REGION,
    bucketName: process.env.STORAGE_BUCKET_NAME,
    publicUrl: process.env.STORAGE_BUCKET_URL,
    accessKeyId: process.env.STORAGE_ACCESS_KEY,
    secretAccessKey: process.env.STORAGE_SECRET_KEY,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Konfigurasi S3 belum lengkap: ${missing.join(", ")}.`);
  }

  return {
    endpoint: config.endpoint!,
    region: config.region!,
    bucketName: config.bucketName!,
    publicUrl: config.publicUrl!.replace(/\/$/, ""),
    accessKeyId: config.accessKeyId!,
    secretAccessKey: config.secretAccessKey!,
  };
}

async function optimizeProductImage(file: File) {
  const input = Buffer.from(await file.arrayBuffer());

  try {
    const image = sharp(input, {
      failOn: "warning",
      limitInputPixels: 40_000_000,
    });
    const metadata = await image.metadata();

    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      throw new Error("Format gambar tidak didukung.");
    }

    return image
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
    throw new Error("File gambar rusak atau isinya tidak sesuai format JPG, PNG, atau WebP.");
  }
}

async function saveLocalProductImage(fileName: string, contents: Buffer) {
  const directory = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName), contents, { flag: "wx" });

  return `${LOCAL_IMAGE_URL_PREFIX}${fileName}`;
}

async function saveS3ProductImage(fileName: string, contents: Buffer) {
  const config = getS3StorageConfig();
  const key = `${PRODUCT_IMAGE_KEY_PREFIX}${fileName}`;
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  await client.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: contents,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return `${config.publicUrl}/${key}`;
}

export async function saveProductImage(file: File) {
  const parsedFile = productImageFileSchema.safeParse(file);

  if (!parsedFile.success || !parsedFile.data) {
    throw new Error(parsedFile.error?.issues[0]?.message ?? "File gambar tidak valid.");
  }

  const contents = await optimizeProductImage(parsedFile.data);
  const fileName = `${randomUUID()}.webp`;

  return getStorageDriver() === "s3"
    ? saveS3ProductImage(fileName, contents)
    : saveLocalProductImage(fileName, contents);
}

async function deleteLocalProductImage(imageUrl: string) {
  if (!imageUrl.startsWith(LOCAL_IMAGE_URL_PREFIX)) {
    return;
  }

  const fileName = imageUrl.slice(LOCAL_IMAGE_URL_PREFIX.length);

  if (!/^[0-9a-f-]{36}\.webp$/i.test(fileName)) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", "uploads", "products", fileName);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await unlink(filePath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code === "ENOENT") {
        return;
      }

      if ((code !== "EBUSY" && code !== "EPERM") || attempt === 4) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}

async function deleteS3ProductImage(imageUrl: string) {
  const config = getS3StorageConfig();
  const publicPrefix = `${config.publicUrl}/${PRODUCT_IMAGE_KEY_PREFIX}`;

  if (!imageUrl.startsWith(publicPrefix)) {
    return;
  }

  const key = `${PRODUCT_IMAGE_KEY_PREFIX}${imageUrl.slice(publicPrefix.length)}`;

  if (!/^products\/[0-9a-f-]{36}\.webp$/i.test(key)) {
    return;
  }

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  await client.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }));
}

export async function deleteProductImage(imageUrl: string | null | undefined) {
  if (!imageUrl) {
    return;
  }

  if (imageUrl.startsWith(LOCAL_IMAGE_URL_PREFIX)) {
    await deleteLocalProductImage(imageUrl);
    return;
  }

  if (getStorageDriver() === "s3") {
    await deleteS3ProductImage(imageUrl);
  }
}
