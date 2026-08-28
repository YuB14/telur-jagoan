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
import { z } from "zod";

const LOCAL_LOGO_URL_PREFIX = "/uploads/logo/";
const LOGO_KEY_PREFIX = "logo/";

export const storeLogoFileSchema = z
  .instanceof(File, { message: "Pilih file logo yang valid." })
  .refine((file) => file.size <= 5 * 1024 * 1024, "Ukuran file logo maksimal 5MB.")
  .refine(
    (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    "Format logo hanya JPG, PNG, atau WebP.",
  );

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

function getS3StorageConfig() {
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

async function optimizeStoreLogo(file: File) {
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
        width: 600,
        height: 600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
  } catch {
    throw new Error("File logo rusak atau isinya tidak sesuai format JPG, PNG, atau WebP.");
  }
}

async function saveLocalStoreLogo(fileName: string, contents: Buffer) {
  const directory = path.join(process.cwd(), "public", "uploads", "logo");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName), contents, { flag: "wx" });

  return `${LOCAL_LOGO_URL_PREFIX}${fileName}`;
}

async function saveS3StoreLogo(fileName: string, contents: Buffer) {
  const config = getS3StorageConfig();
  const key = `${LOGO_KEY_PREFIX}${fileName}`;
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

export async function saveStoreLogo(file: File) {
  const parsedFile = storeLogoFileSchema.safeParse(file);

  if (!parsedFile.success || !parsedFile.data) {
    throw new Error(parsedFile.error?.issues[0]?.message ?? "File logo tidak valid.");
  }

  const contents = await optimizeStoreLogo(parsedFile.data);
  const fileName = `${randomUUID()}.webp`;

  return getStorageDriver() === "s3"
    ? saveS3StoreLogo(fileName, contents)
    : saveLocalStoreLogo(fileName, contents);
}

async function deleteLocalStoreLogo(logoUrl: string) {
  if (!logoUrl.startsWith(LOCAL_LOGO_URL_PREFIX)) {
    return;
  }

  const fileName = logoUrl.slice(LOCAL_LOGO_URL_PREFIX.length);

  if (!/^[0-9a-f-]{36}\.webp$/i.test(fileName)) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", "uploads", "logo", fileName);

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

async function deleteS3StoreLogo(logoUrl: string) {
  const config = getS3StorageConfig();
  const publicPrefix = `${config.publicUrl}/${LOGO_KEY_PREFIX}`;

  if (!logoUrl.startsWith(publicPrefix)) {
    return;
  }

  const key = `${LOGO_KEY_PREFIX}${logoUrl.slice(publicPrefix.length)}`;

  if (!/^logo\/[0-9a-f-]{36}\.webp$/i.test(key)) {
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

export async function deleteStoreLogo(logoUrl: string | null | undefined) {
  if (!logoUrl) {
    return;
  }

  if (logoUrl.startsWith(LOCAL_LOGO_URL_PREFIX)) {
    await deleteLocalStoreLogo(logoUrl);
    return;
  }

  if (getStorageDriver() === "s3") {
    await deleteS3StoreLogo(logoUrl);
  }
}
