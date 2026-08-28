import "server-only";

import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requireOwner } from "@/server/services/authorization";
import { deleteStoreLogo, saveStoreLogo } from "@/server/services/store-logo-storage";
import type { CashierFormInput, ReceiptSettingsFormInput } from "@/server/validations/settings";

export class SettingsServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsServiceError";
  }
}

const BACKUP_DIR = path.join(process.cwd(), "storage", "backups");

function nullable(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value, (_key, current) => {
    if (current instanceof Date) return current.toISOString();
    if (current instanceof Prisma.Decimal) return current.toString();
    return current;
  })) as Prisma.InputJsonValue;
}

async function logActivity(
  transaction: Prisma.TransactionClient,
  input: { userId: string; action: string; entityType: string; entityId: string; oldValues?: unknown; newValues?: unknown },
) {
  await transaction.activityLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValues: input.oldValues === undefined ? undefined : toJsonValue(input.oldValues),
      newValues: input.newValues === undefined ? undefined : toJsonValue(input.newValues),
    },
  });
}

async function ensureCashierUnique(input: CashierFormInput, excludedId?: string) {
  const duplicate = await db.user.findFirst({
    where: {
      ...(excludedId ? { id: { not: excludedId } } : {}),
      OR: [
        { username: { equals: input.username, mode: "insensitive" } },
        { email: { equals: input.email, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (duplicate) throw new SettingsServiceError("Username atau email sudah digunakan.");
}

export async function listCashiers() {
  await requireOwner();
  return db.user.findMany({
    where: { role: "CASHIER" },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
    },
  });
}

export async function getCashierForEdit(id: string) {
  await requireOwner();
  return db.user.findFirst({
    where: { id, role: "CASHIER" },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      isActive: true,
    },
  });
}

export async function createCashier(input: CashierFormInput) {
  const owner = await requireOwner();
  await ensureCashierUnique(input);
  if (!input.password) throw new SettingsServiceError("Password wajib diisi.");

  return db.$transaction(async (transaction) => {
    const cashier = await transaction.user.create({
      data: {
        name: input.name,
        username: input.username,
        email: input.email,
        phone: input.phone,
        passwordHash: await hashPassword(input.password ?? ""),
        role: "CASHIER",
        isActive: input.isActive,
      },
    });
    await logActivity(transaction, {
      userId: owner.id,
      action: "CREATE_CASHIER",
      entityType: "User",
      entityId: cashier.id,
      newValues: { ...cashier, passwordHash: "[REDACTED]" },
    });
    return cashier;
  });
}

export async function updateCashier(id: string, input: CashierFormInput) {
  const owner = await requireOwner();
  if (id === owner.id) throw new SettingsServiceError("Owner tidak bisa mengubah akun sendiri dari menu kasir.");
  await ensureCashierUnique(input, id);

  return db.$transaction(async (transaction) => {
    const existing = await transaction.user.findFirst({ where: { id, role: "CASHIER" } });
    if (!existing) throw new SettingsServiceError("Akun kasir tidak ditemukan.");

    const updated = await transaction.user.update({
      where: { id },
      data: {
        name: input.name,
        username: input.username,
        email: input.email,
        phone: input.phone,
        isActive: input.isActive,
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      },
    });
    await logActivity(transaction, {
      userId: owner.id,
      action: "UPDATE_CASHIER",
      entityType: "User",
      entityId: id,
      oldValues: { ...existing, passwordHash: "[REDACTED]" },
      newValues: { ...updated, passwordHash: "[REDACTED]" },
    });
    return updated;
  });
}

export async function deactivateCashier(id: string) {
  const owner = await requireOwner();
  if (id === owner.id) throw new SettingsServiceError("Owner tidak bisa menonaktifkan akun sendiri.");

  return db.$transaction(async (transaction) => {
    const existing = await transaction.user.findFirst({ where: { id, role: "CASHIER" } });
    if (!existing) throw new SettingsServiceError("Akun kasir tidak ditemukan.");
    const updated = await transaction.user.update({ where: { id }, data: { isActive: false } });
    await logActivity(transaction, {
      userId: owner.id,
      action: "DEACTIVATE_CASHIER",
      entityType: "User",
      entityId: id,
      oldValues: { ...existing, passwordHash: "[REDACTED]" },
      newValues: { ...updated, passwordHash: "[REDACTED]" },
    });
  });
}

export async function getReceiptSettings() {
  await requireOwner();
  const existing = await db.storeSetting.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;

  return db.storeSetting.create({
    data: {
      storeName: "Telur Jagoan",
      tagline: "Toko telur segar",
      address: "Alamat toko belum diatur",
      phone: "081234567890",
      whatsapp: "081234567890",
      receiptFooter: "Terima kasih sudah belanja di Telur Jagoan.",
    },
  });
}

export async function getReceiptPrintSettings() {
  const existing = await db.storeSetting.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      storeName: true,
      logoUrl: true,
      address: true,
      phone: true,
      receiptFooter: true,
    },
  });

  return existing ?? {
    storeName: "Telur Jagoan",
    logoUrl: null,
    address: "Alamat toko belum diatur",
    phone: "081234567890",
    receiptFooter: "Terima kasih sudah belanja di Telur Jagoan.",
  };
}

export async function updateReceiptSettings(input: ReceiptSettingsFormInput) {
  const owner = await requireOwner();

  return db.$transaction(async (transaction) => {
    const existing = await transaction.storeSetting.findFirst({ orderBy: { createdAt: "asc" } });

    let newLogoUrl = existing?.logoUrl ?? null;

    if (input.removeLogo) {
      if (existing?.logoUrl) {
        await deleteStoreLogo(existing.logoUrl);
      }
      newLogoUrl = null;
    }

    if (input.logo && input.logo.size > 0) {
      if (existing?.logoUrl && !input.removeLogo) {
        await deleteStoreLogo(existing.logoUrl);
      }
      newLogoUrl = await saveStoreLogo(input.logo);
    }

    const data = {
      storeName: input.storeName,
      logoUrl: newLogoUrl,
      address: nullable(input.address),
      phone: nullable(input.phone),
      whatsapp: nullable(input.phone),
      receiptFooter: nullable(input.receiptFooter),
    };
    const updated = existing
      ? await transaction.storeSetting.update({ where: { id: existing.id }, data })
      : await transaction.storeSetting.create({ data });

    await logActivity(transaction, {
      userId: owner.id,
      action: "UPDATE_RECEIPT_SETTINGS",
      entityType: "StoreSetting",
      entityId: updated.id,
      oldValues: existing,
      newValues: updated,
    });
    return updated;
  });
}

export async function getLastBackup() {
  await requireOwner();
  await mkdir(BACKUP_DIR, { recursive: true });
  const files = await readdir(BACKUP_DIR);
  const backups = await Promise.all(
    files.filter((file) => file.endsWith(".sql")).map(async (file) => {
      const absolutePath = path.join(BACKUP_DIR, file);
      const info = await stat(absolutePath);
      return { file, createdAt: info.mtime, size: info.size };
    }),
  );
  return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

export async function createManualBackup() {
  const owner = await requireOwner();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new SettingsServiceError("DATABASE_URL belum dikonfigurasi.");

  await mkdir(BACKUP_DIR, { recursive: true });
  const filename = `telur-jagoan-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.sql`;
  const absolutePath = path.join(BACKUP_DIR, filename);

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(absolutePath);
    const child = spawn("pg_dump", [databaseUrl, "--no-owner", "--no-privileges"], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    child.stdout.pipe(output);
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      output.close();
      if (code === 0) resolve();
      else reject(new Error(stderr || `pg_dump keluar dengan kode ${code}.`));
    });
  }).catch((error) => {
    throw new SettingsServiceError(
      `Backup gagal. Pastikan pg_dump tersedia di server. Detail: ${error instanceof Error ? error.message : String(error)}`,
    );
  });

  await db.activityLog.create({
    data: {
      userId: owner.id,
      action: "CREATE_MANUAL_BACKUP",
      entityType: "Backup",
      newValues: { filename },
    },
  });

  return { file: filename };
}

export function getBackupAbsolutePath(filename: string) {
  if (!/^[A-Za-z0-9._-]+\.sql$/.test(filename)) {
    throw new SettingsServiceError("Nama file backup tidak valid.");
  }
  return path.join(BACKUP_DIR, filename);
}
