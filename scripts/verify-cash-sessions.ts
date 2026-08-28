import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import {
  formatDatedNumber,
  getNextDatedSequence,
} from "../src/lib/inventory-number";
import { openCashSessionFormSchema } from "../src/server/validations/cash-session";

loadEnvConfig(process.cwd(), true);

const validUuid = "11111111-1111-4111-8111-111111111111";
const validationCases = [
  ["modal nol valid", { cashRegisterId: validUuid, openingCash: "0", notes: "" }, true],
  ["modal pecahan valid", { cashRegisterId: validUuid, openingCash: "150000.50", notes: "Shift pagi" }, true],
  ["modal negatif", { cashRegisterId: validUuid, openingCash: "-1", notes: "" }, false],
  ["presisi berlebih", { cashRegisterId: validUuid, openingCash: "100.001", notes: "" }, false],
  ["register bukan UUID", { cashRegisterId: "KASIR-01", openingCash: "100", notes: "" }, false],
  ["catatan terlalu panjang", { cashRegisterId: validUuid, openingCash: "100", notes: "x".repeat(5_001) }, false],
] as const;

for (const [name, input, expected] of validationCases) {
  if (openCashSessionFormSchema.safeParse(input).success !== expected) {
    throw new Error(`Kasus validasi sesi gagal: ${name}`);
  }
}

if (
  getNextDatedSequence(["TJ-SES-20260807-0001", "TJ-SES-20260807-0003"], "SES", "20260807") !== 4 ||
  formatDatedNumber("SES", "20260807", 4) !== "TJ-SES-20260807-0004"
) {
  throw new Error("Generator nomor sesi kasir gagal.");
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum dikonfigurasi.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const uniqueKey = String(Date.now());
  const username = `verify-cashier-${uniqueKey}`;
  let duplicateWasRejected = false;

  try {
    try {
      await db.$transaction(async (transaction) => {
        const cashier = await transaction.user.create({
          data: {
            name: "Kasir Verifikasi",
            username,
            email: `${username}@example.invalid`,
            passwordHash: "not-used-in-verification",
            role: "CASHIER",
            phone: "081200000000",
          },
        });
        const register =
          (await transaction.cashRegister.findFirst({
            where: { isActive: true },
            select: { id: true },
          })) ??
          (await transaction.cashRegister.create({
            data: { code: `VERIFY-${uniqueKey}`, name: "Register Verifikasi" },
            select: { id: true },
          }));
        const openingCash = new Prisma.Decimal("250000.50");
        const cashSession = await transaction.cashSession.create({
          data: {
            sessionNumber: `TJ-SES-20991231-${uniqueKey}`,
            cashRegisterId: register.id,
            cashierId: cashier.id,
            openingCash,
          },
        });
        await transaction.cashMovement.create({
          data: {
            cashSessionId: cashSession.id,
            movementType: "OPENING_CASH",
            amount: openingCash,
            referenceType: "CASH_SESSION",
            referenceId: cashSession.id,
            createdBy: cashier.id,
          },
        });

        const stored = await transaction.cashSession.findUniqueOrThrow({
          where: { id: cashSession.id },
          include: { cashMovements: true },
        });
        if (
          stored.status !== "OPEN" ||
          !stored.openingCash.equals(openingCash) ||
          stored.cashMovements.length !== 1 ||
          stored.cashMovements[0].movementType !== "OPENING_CASH" ||
          !stored.cashMovements[0].amount.equals(openingCash)
        ) {
          throw new Error("Relasi sesi dan modal awal tidak konsisten.");
        }

        await transaction.cashSession.create({
          data: {
            sessionNumber: `TJ-SES-20991231-${uniqueKey}-DUPLICATE`,
            cashRegisterId: register.id,
            cashierId: cashier.id,
            openingCash: 0,
          },
        });
        throw new Error("Constraint satu sesi OPEN per Kasir tidak aktif.");
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        duplicateWasRejected = true;
      } else {
        throw error;
      }
    }

    if (!duplicateWasRejected) throw new Error("Sesi aktif ganda tidak ditolak.");
    const leakedUser = await db.user.findUnique({ where: { username }, select: { id: true } });
    if (leakedUser) throw new Error("Data verifikasi sesi tidak ter-rollback.");
  } finally {
    await db.$disconnect();
  }

  const totalCases = validationCases.length + 5;
  console.log(
    `Validasi sesi kasir: ${totalCases}/${totalCases} kasus lulus; nomor sesi, movement modal awal, sesi ganda, dan rollback lulus.`,
  );
}

void main();
