import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { z } from "zod";

import {
  BatchStatus,
  CashMovementType,
  CashSessionStatus,
  CustomerType,
  NotificationType,
  PaymentMethodType,
  PrismaClient,
  PurchasePaymentStatus,
  PurchaseRefundMethod,
  PurchaseReturnReason,
  PurchaseStatus,
  ReturnStatus,
  SaleRefundMethod,
  SaleReturnReason,
  SaleStatus,
  StockDamageType,
  StockMovementType,
  UserRole,
} from "../src/generated/prisma/client";
import { DEFAULT_CUSTOMER_CODE, DEFAULT_CUSTOMER_NAME } from "../src/lib/customer-code";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const STORE_SETTING_ID = "00000000-0000-0000-0000-000000000001";
const now = new Date("2026-08-11T10:00:00+07:00");
const today = new Date("2026-08-11T00:00:00+07:00");
const yesterday = new Date("2026-08-10T00:00:00+07:00");
const twoDaysAgo = new Date("2026-08-09T00:00:00+07:00");
const nextWeek = new Date("2026-08-18T00:00:00+07:00");
const tomorrow = new Date("2026-08-12T00:00:00+07:00");
const expirySoon = new Date("2026-08-25T00:00:00+07:00");
const expiryLater = new Date("2026-09-20T00:00:00+07:00");

const seedPurchaseNumbers = [
  "TJ-PUR-20260809-0001",
  "TJ-PUR-20260810-0001",
  "TJ-PUR-20260811-0001",
];
const seedPaymentNumbers = ["TJ-PAY-20260809-0001", "TJ-PAY-20260810-0001"];
const seedBatchNumbers = [
  "TJ-BAT-20260809-0001",
  "TJ-BAT-20260809-0002",
  "TJ-BAT-20260810-0001",
  "TJ-BAT-20260810-0002",
  "TJ-BAT-20260811-0001",
  "TJ-BAT-20260811-0002",
];
const seedMovementNumbers = [
  "TJ-STK-20260809-0001",
  "TJ-STK-20260809-0002",
  "TJ-STK-20260810-0001",
  "TJ-STK-20260810-0002",
  "TJ-STK-20260811-0001",
  "TJ-STK-20260811-0002",
  "TJ-STK-20260810-0003",
  "TJ-STK-20260811-0003",
  "TJ-STK-20260811-0004",
  "TJ-STK-20260811-0005",
  "TJ-STK-20260811-0006",
  "TJ-STK-20260811-0007",
  "TJ-STK-20260811-0008",
  "TJ-STK-20260810-0004",
];
const seedSaleNumbers = [
  "TJ-SAL-20260810-0001",
  "TJ-SAL-20260811-0001",
  "TJ-SAL-20260811-0002",
];
const seedSessionNumbers = ["TJ-SES-20260810-0001", "TJ-SES-20260811-0001"];
const seedSaleReturnNumbers = ["TJ-SRT-20260811-0001"];
const seedPurchaseReturnNumbers = ["TJ-PRT-20260810-0001"];
const seedDamageNumbers = ["TJ-DMG-20260811-0001"];
const seedExpenseNumbers = ["TJ-EXP-20260810-0001", "TJ-EXP-20260811-0001"];
const seedIncomeNumbers = ["TJ-INC-20260811-0001"];

const passwordSchema = z
  .string()
  .min(8, "minimal 8 karakter")
  .max(255, "maksimal 255 karakter")
  .refine(
    (password) => !password.toUpperCase().includes("CHANGE_ME"),
    "masih menggunakan nilai contoh CHANGE_ME",
  );

function money(value: number) {
  return value.toFixed(2);
}

function qty(value: number) {
  return value.toFixed(3);
}

function getSeedPassword(variableName: "SEED_OWNER_PASSWORD" | "SEED_CASHIER_PASSWORD") {
  const result = passwordSchema.safeParse(process.env[variableName]);

  if (!result.success) {
    const reason = result.error.issues[0]?.message ?? "tidak valid";
    throw new Error(`${variableName} ${reason}. Atur nilainya di environment sebelum menjalankan seed.`);
  }

  return result.data;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL belum dikonfigurasi.");
  }

  const ownerPassword = getSeedPassword("SEED_OWNER_PASSWORD");
  const cashierPassword = getSeedPassword("SEED_CASHIER_PASSWORD");
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const [ownerPasswordHash, cashierPasswordHash] = await Promise.all([
      hash(ownerPassword, 12),
      hash(cashierPassword, 12),
    ]);

    const result = await prisma.$transaction(async (tx) => {
      const seedSessions = await tx.cashSession.findMany({
        where: { sessionNumber: { in: seedSessionNumbers } },
        select: { id: true },
      });

      await tx.notification.deleteMany({
        where: {
          title: {
            in: [
              "Seed: Stok telur ayam menipis",
              "Seed: Hutang supplier jatuh tempo",
              "Seed: Batch dekat kedaluwarsa",
              "Seed: Selisih kas sesi kemarin",
              "Seed: Retur penjualan selesai",
            ],
          },
        },
      });
      await tx.expense.deleteMany({ where: { expenseNumber: { in: seedExpenseNumbers } } });
      await tx.otherIncome.deleteMany({ where: { incomeNumber: { in: seedIncomeNumbers } } });
      await tx.cashMovement.deleteMany({ where: { cashSessionId: { in: seedSessions.map((session) => session.id) } } });
      await tx.saleReturnItem.deleteMany({
        where: { saleReturn: { returnNumber: { in: seedSaleReturnNumbers } } },
      });
      await tx.saleReturn.deleteMany({ where: { returnNumber: { in: seedSaleReturnNumbers } } });
      await tx.saleBatchAllocation.deleteMany({
        where: { saleItem: { sale: { saleNumber: { in: seedSaleNumbers } } } },
      });
      await tx.salePayment.deleteMany({ where: { sale: { saleNumber: { in: seedSaleNumbers } } } });
      await tx.saleItem.deleteMany({ where: { sale: { saleNumber: { in: seedSaleNumbers } } } });
      await tx.sale.deleteMany({ where: { saleNumber: { in: seedSaleNumbers } } });
      await tx.stockMovement.deleteMany({ where: { movementNumber: { in: seedMovementNumbers } } });
      await tx.stockDamage.deleteMany({ where: { damageNumber: { in: seedDamageNumbers } } });
      await tx.purchaseReturnItem.deleteMany({
        where: { purchaseReturn: { returnNumber: { in: seedPurchaseReturnNumbers } } },
      });
      await tx.purchaseReturn.deleteMany({ where: { returnNumber: { in: seedPurchaseReturnNumbers } } });
      await tx.inventoryBatch.deleteMany({ where: { batchNumber: { in: seedBatchNumbers } } });
      await tx.purchasePayment.deleteMany({ where: { paymentNumber: { in: seedPaymentNumbers } } });
      await tx.purchaseItem.deleteMany({ where: { purchase: { purchaseNumber: { in: seedPurchaseNumbers } } } });
      await tx.purchase.deleteMany({ where: { purchaseNumber: { in: seedPurchaseNumbers } } });
      await tx.cashSession.deleteMany({ where: { sessionNumber: { in: seedSessionNumbers } } });

      const owner = await tx.user.upsert({
        where: { username: "owner" },
        update: {
          name: "Owner Telur Jagoan",
          email: "owner@telurjagoan.local",
          passwordHash: ownerPasswordHash,
          role: UserRole.OWNER,
          phone: "081234567890",
          isActive: true,
        },
        create: {
          name: "Owner Telur Jagoan",
          username: "owner",
          email: "owner@telurjagoan.local",
          passwordHash: ownerPasswordHash,
          role: UserRole.OWNER,
          phone: "081234567890",
          isActive: true,
        },
      });
      const cashier = await tx.user.upsert({
        where: { username: "kasir" },
        update: {
          name: "Kasir Telur Jagoan",
          email: "kasir@telurjagoan.local",
          passwordHash: cashierPasswordHash,
          role: UserRole.CASHIER,
          phone: "081234567891",
          isActive: true,
        },
        create: {
          name: "Kasir Telur Jagoan",
          username: "kasir",
          email: "kasir@telurjagoan.local",
          passwordHash: cashierPasswordHash,
          role: UserRole.CASHIER,
          phone: "081234567891",
          isActive: true,
        },
      });
      const cashierTwo = await tx.user.upsert({
        where: { username: "kasir2" },
        update: {
          name: "Kasir Cabang",
          email: "kasir2@telurjagoan.local",
          passwordHash: cashierPasswordHash,
          role: UserRole.CASHIER,
          phone: "081234567892",
          isActive: true,
        },
        create: {
          name: "Kasir Cabang",
          username: "kasir2",
          email: "kasir2@telurjagoan.local",
          passwordHash: cashierPasswordHash,
          role: UserRole.CASHIER,
          phone: "081234567892",
          isActive: true,
        },
      });

      const [defaultCustomer, retailCustomer, wholesaleCustomer] = await Promise.all([
        tx.customer.upsert({
          where: { customerCode: DEFAULT_CUSTOMER_CODE },
          update: {
            name: DEFAULT_CUSTOMER_NAME,
            phone: null,
            address: null,
            customerType: CustomerType.GENERAL,
            isActive: true,
          },
          create: {
            customerCode: DEFAULT_CUSTOMER_CODE,
            name: DEFAULT_CUSTOMER_NAME,
            customerType: CustomerType.GENERAL,
            isActive: true,
          },
        }),
        tx.customer.upsert({
          where: { customerCode: "CUS-0001" },
          update: {
            name: "Warung Bu Sari",
            phone: "081277771111",
            address: "Jl. Melati No. 12, Jakarta",
            customerType: CustomerType.RETAIL,
            isActive: true,
          },
          create: {
            customerCode: "CUS-0001",
            name: "Warung Bu Sari",
            phone: "081277771111",
            address: "Jl. Melati No. 12, Jakarta",
            customerType: CustomerType.RETAIL,
            isActive: true,
          },
        }),
        tx.customer.upsert({
          where: { customerCode: "CUS-0002" },
          update: {
            name: "Toko Sembako Makmur",
            phone: "081288882222",
            address: "Pasar Induk Blok B-17",
            customerType: CustomerType.WHOLESALE,
            isActive: true,
          },
          create: {
            customerCode: "CUS-0002",
            name: "Toko Sembako Makmur",
            phone: "081288882222",
            address: "Pasar Induk Blok B-17",
            customerType: CustomerType.WHOLESALE,
            isActive: true,
          },
        }),
      ]);

      const [cashMethod, qrisMethod, transferMethod, debitMethod] = await Promise.all([
        tx.paymentMethod.upsert({
          where: { code: "CASH" },
          update: { name: "Tunai", type: PaymentMethodType.CASH, isActive: true },
          create: { code: "CASH", name: "Tunai", type: PaymentMethodType.CASH, isActive: true },
        }),
        tx.paymentMethod.upsert({
          where: { code: "QRIS" },
          update: { name: "QRIS", type: PaymentMethodType.QRIS, isActive: true },
          create: { code: "QRIS", name: "QRIS", type: PaymentMethodType.QRIS, isActive: true },
        }),
        tx.paymentMethod.upsert({
          where: { code: "TRANSFER" },
          update: { name: "Transfer", type: PaymentMethodType.TRANSFER, isActive: true },
          create: { code: "TRANSFER", name: "Transfer", type: PaymentMethodType.TRANSFER, isActive: true },
        }),
        tx.paymentMethod.upsert({
          where: { code: "DEBIT" },
          update: { name: "Kartu Debit", type: PaymentMethodType.DEBIT_CARD, isActive: true },
          create: { code: "DEBIT", name: "Kartu Debit", type: PaymentMethodType.DEBIT_CARD, isActive: true },
        }),
      ]);

      const [cashRegister, backupRegister] = await Promise.all([
        tx.cashRegister.upsert({
          where: { code: "KASIR-01" },
          update: { name: "Kasir Utama", location: "Toko Telur Jagoan", isActive: true },
          create: { code: "KASIR-01", name: "Kasir Utama", location: "Toko Telur Jagoan", isActive: true },
        }),
        tx.cashRegister.upsert({
          where: { code: "KASIR-02" },
          update: { name: "Kasir Cadangan", location: "Toko Telur Jagoan", isActive: true },
          create: { code: "KASIR-02", name: "Kasir Cadangan", location: "Toko Telur Jagoan", isActive: true },
        }),
      ]);

      const [opsCategory, salaryCategory, packagingCategory] = await Promise.all([
        tx.expenseCategory.upsert({
          where: { code: "EXP-OTHER" },
          update: { name: "Lain-lain", description: "Kategori default untuk pengeluaran umum.", isActive: true },
          create: { code: "EXP-OTHER", name: "Lain-lain", description: "Kategori default untuk pengeluaran umum.", isActive: true },
        }),
        tx.expenseCategory.upsert({
          where: { code: "EXP-SALARY" },
          update: { name: "Gaji dan Honor", description: "Biaya tenaga kerja harian.", isActive: true },
          create: { code: "EXP-SALARY", name: "Gaji dan Honor", description: "Biaya tenaga kerja harian.", isActive: true },
        }),
        tx.expenseCategory.upsert({
          where: { code: "EXP-PACK" },
          update: { name: "Kemasan", description: "Plastik, tray, dan kardus telur.", isActive: true },
          create: { code: "EXP-PACK", name: "Kemasan", description: "Plastik, tray, dan kardus telur.", isActive: true },
        }),
      ]);

      const [catAyam, catBebek, catPuyuh, catPremium] = await Promise.all([
        tx.productCategory.upsert({
          where: { categoryCode: "CAT-AYAM" },
          update: { name: "Telur Ayam", description: "Telur ayam ras dan kampung.", isActive: true },
          create: { categoryCode: "CAT-AYAM", name: "Telur Ayam", description: "Telur ayam ras dan kampung.", isActive: true },
        }),
        tx.productCategory.upsert({
          where: { categoryCode: "CAT-BEBEK" },
          update: { name: "Telur Bebek", description: "Telur bebek segar.", isActive: true },
          create: { categoryCode: "CAT-BEBEK", name: "Telur Bebek", description: "Telur bebek segar.", isActive: true },
        }),
        tx.productCategory.upsert({
          where: { categoryCode: "CAT-PUYUH" },
          update: { name: "Telur Puyuh", description: "Telur puyuh curah.", isActive: true },
          create: { categoryCode: "CAT-PUYUH", name: "Telur Puyuh", description: "Telur puyuh curah.", isActive: true },
        }),
        tx.productCategory.upsert({
          where: { categoryCode: "CAT-PREMIUM" },
          update: { name: "Telur Premium", description: "Telur omega dan pilihan.", isActive: true },
          create: { categoryCode: "CAT-PREMIUM", name: "Telur Premium", description: "Telur omega dan pilihan.", isActive: true },
        }),
      ]);

      const [supBerkah, supJaya, supSari] = await Promise.all([
        tx.supplier.upsert({
          where: { supplierCode: "SUP-0001" },
          update: {
            name: "Berkah Farm",
            contactPerson: "Pak Hadi",
            phone: "081311110001",
            email: "berkahfarm@example.local",
            address: "Bogor, Jawa Barat",
            notes: "Supplier utama telur ayam ras.",
            isActive: true,
          },
          create: {
            supplierCode: "SUP-0001",
            name: "Berkah Farm",
            contactPerson: "Pak Hadi",
            phone: "081311110001",
            email: "berkahfarm@example.local",
            address: "Bogor, Jawa Barat",
            notes: "Supplier utama telur ayam ras.",
            isActive: true,
          },
        }),
        tx.supplier.upsert({
          where: { supplierCode: "SUP-0002" },
          update: {
            name: "Jaya Telur",
            contactPerson: "Bu Rina",
            phone: "081322220002",
            email: "jayatelur@example.local",
            address: "Depok, Jawa Barat",
            notes: "Supplier telur bebek dan telur kampung.",
            isActive: true,
          },
          create: {
            supplierCode: "SUP-0002",
            name: "Jaya Telur",
            contactPerson: "Bu Rina",
            phone: "081322220002",
            email: "jayatelur@example.local",
            address: "Depok, Jawa Barat",
            notes: "Supplier telur bebek dan telur kampung.",
            isActive: true,
          },
        }),
        tx.supplier.upsert({
          where: { supplierCode: "SUP-0003" },
          update: {
            name: "Sari Unggas",
            contactPerson: "Pak Andi",
            phone: "081333330003",
            email: "sariunggas@example.local",
            address: "Tangerang, Banten",
            notes: "Supplier telur puyuh dan omega.",
            isActive: true,
          },
          create: {
            supplierCode: "SUP-0003",
            name: "Sari Unggas",
            contactPerson: "Pak Andi",
            phone: "081333330003",
            email: "sariunggas@example.local",
            address: "Tangerang, Banten",
            notes: "Supplier telur puyuh dan omega.",
            isActive: true,
          },
        }),
      ]);

      await tx.storeSetting.upsert({
        where: { id: STORE_SETTING_ID },
        update: {
          storeName: "Telur Jagoan",
          tagline: "Toko telur segar",
          address: "Jl. Niaga Telur No. 17, Jakarta",
          phone: "081234567890",
          whatsapp: "081234567890",
          receiptFooter: "Terima kasih sudah belanja di Telur Jagoan.",
          currency: "IDR",
          timezone: "Asia/Jakarta",
        },
        create: {
          id: STORE_SETTING_ID,
          storeName: "Telur Jagoan",
          tagline: "Toko telur segar",
          address: "Jl. Niaga Telur No. 17, Jakarta",
          phone: "081234567890",
          whatsapp: "081234567890",
          receiptFooter: "Terima kasih sudah belanja di Telur Jagoan.",
          currency: "IDR",
          timezone: "Asia/Jakarta",
        },
      });

      async function ensureProduct(params: {
        code: string;
        barcode: string;
        name: string;
        categoryId: string;
        minimumStock: number;
        currentStock: number;
        sellingPrice: number;
        wholesalePrice: number;
      }) {
        const product = await tx.product.upsert({
          where: { productCode: params.code },
          update: {
            barcode: params.barcode,
            categoryId: params.categoryId,
            name: params.name,
            description: `${params.name} segar untuk data contoh.`,
            baseUnitName: "Kg",
            minimumStock: qty(params.minimumStock),
            currentStock: qty(params.currentStock),
            isFeatured: true,
            isActive: true,
          },
          create: {
            productCode: params.code,
            barcode: params.barcode,
            categoryId: params.categoryId,
            name: params.name,
            description: `${params.name} segar untuk data contoh.`,
            baseUnitName: "Kg",
            minimumStock: qty(params.minimumStock),
            currentStock: qty(params.currentStock),
            isFeatured: true,
            isActive: true,
          },
        });

        const existingUnit = await tx.productUnit.findFirst({
          where: { productId: product.id, unitName: "Kg" },
        });
        const unitData = {
          conversionToBase: "1.0000",
          sellingPrice: money(params.sellingPrice),
          wholesalePrice: money(params.wholesalePrice),
          barcode: params.barcode,
          isBaseUnit: true,
          isActive: true,
        };
        const unit = existingUnit
          ? await tx.productUnit.update({ where: { id: existingUnit.id }, data: unitData })
          : await tx.productUnit.create({ data: { productId: product.id, unitName: "Kg", ...unitData } });

        return { product, unit };
      }

      const ayam = await ensureProduct({
        code: "PRD-AYAM-RAS",
        barcode: "899700000001",
        name: "Telur Ayam Ras",
        categoryId: catAyam.id,
        minimumStock: 40,
        currentStock: 486,
        sellingPrice: 28000,
        wholesalePrice: 26500,
      });
      const kampung = await ensureProduct({
        code: "PRD-AYAM-KAMPUNG",
        barcode: "899700000002",
        name: "Telur Ayam Kampung",
        categoryId: catAyam.id,
        minimumStock: 15,
        currentStock: 76,
        sellingPrice: 42000,
        wholesalePrice: 39500,
      });
      const bebek = await ensureProduct({
        code: "PRD-BEBEK",
        barcode: "899700000003",
        name: "Telur Bebek",
        categoryId: catBebek.id,
        minimumStock: 20,
        currentStock: 112,
        sellingPrice: 34000,
        wholesalePrice: 32000,
      });
      const puyuh = await ensureProduct({
        code: "PRD-PUYUH",
        barcode: "899700000004",
        name: "Telur Puyuh",
        categoryId: catPuyuh.id,
        minimumStock: 10,
        currentStock: 58,
        sellingPrice: 55000,
        wholesalePrice: 52000,
      });
      const omega = await ensureProduct({
        code: "PRD-OMEGA",
        barcode: "899700000005",
        name: "Telur Omega",
        categoryId: catPremium.id,
        minimumStock: 25,
        currentStock: 90,
        sellingPrice: 47000,
        wholesalePrice: 44000,
      });

      async function createPurchase(params: {
        number: string;
        supplierId: string;
        supplierName: string;
        invoice: string;
        date: Date;
        dueDate?: Date;
        subtotal: number;
        amountPaid: number;
        status: PurchasePaymentStatus;
      }) {
        return tx.purchase.create({
          data: {
            purchaseNumber: params.number,
            supplierId: params.supplierId,
            supplierName: params.supplierName,
            supplierInvoiceNumber: params.invoice,
            purchaseDate: params.date,
            dueDate: params.dueDate,
            subtotal: money(params.subtotal),
            grandTotal: money(params.subtotal),
            amountPaid: money(params.amountPaid),
            remainingDebt: money(params.subtotal - params.amountPaid),
            paymentStatus: params.status,
            status: PurchaseStatus.RECEIVED,
            notes: "Data contoh seed.",
            createdBy: owner.id,
          },
        });
      }

      async function createPurchaseItem(params: {
        purchaseId: string;
        productId: string;
        unitId: string;
        quantity: number;
        unitCost: number;
        expiryDate: Date;
      }) {
        return tx.purchaseItem.create({
          data: {
            purchaseId: params.purchaseId,
            productId: params.productId,
            productUnitId: params.unitId,
            quantity: qty(params.quantity),
            conversionToBase: "1.0000",
            baseQuantity: qty(params.quantity),
            unitCost: money(params.unitCost),
            baseUnitCost: money(params.unitCost),
            subtotal: money(params.quantity * params.unitCost),
            expiryDate: params.expiryDate,
          },
        });
      }

      async function createBatch(params: {
        number: string;
        productId: string;
        purchaseItemId: string;
        supplierId: string;
        receivedDate: Date;
        expiryDate: Date;
        initial: number;
        remaining: number;
        cost: number;
      }) {
        return tx.inventoryBatch.create({
          data: {
            batchNumber: params.number,
            productId: params.productId,
            purchaseItemId: params.purchaseItemId,
            supplierId: params.supplierId,
            receivedDate: params.receivedDate,
            expiryDate: params.expiryDate,
            initialQuantity: qty(params.initial),
            remainingQuantity: qty(params.remaining),
            baseUnitCost: money(params.cost),
            status: BatchStatus.ACTIVE,
          },
        });
      }

      async function createStockMovement(params: {
        number: string;
        productId: string;
        batchId?: string;
        type: StockMovementType;
        inQty?: number;
        outQty?: number;
        before: number;
        after: number;
        referenceType: string;
        referenceId: string;
        description: string;
        createdAt?: Date;
      }) {
        return tx.stockMovement.create({
          data: {
            movementNumber: params.number,
            productId: params.productId,
            inventoryBatchId: params.batchId,
            movementType: params.type,
            quantityIn: qty(params.inQty ?? 0),
            quantityOut: qty(params.outQty ?? 0),
            stockBefore: qty(params.before),
            stockAfter: qty(params.after),
            referenceType: params.referenceType,
            referenceId: params.referenceId,
            description: params.description,
            createdBy: owner.id,
            createdAt: params.createdAt ?? now,
          },
        });
      }

      const purchaseOne = await createPurchase({
        number: "TJ-PUR-20260809-0001",
        supplierId: supBerkah.id,
        supplierName: supBerkah.name,
        invoice: "BF-20260809-001",
        date: twoDaysAgo,
        subtotal: 10140000,
        amountPaid: 10140000,
        status: PurchasePaymentStatus.PAID,
      });
      const ayamItemOne = await createPurchaseItem({
        purchaseId: purchaseOne.id,
        productId: ayam.product.id,
        unitId: ayam.unit.id,
        quantity: 300,
        unitCost: 23000,
        expiryDate: expiryLater,
      });
      const bebekItem = await createPurchaseItem({
        purchaseId: purchaseOne.id,
        productId: bebek.product.id,
        unitId: bebek.unit.id,
        quantity: 120,
        unitCost: 27000,
        expiryDate: expiryLater,
      });
      const ayamBatchOne = await createBatch({
        number: "TJ-BAT-20260809-0001",
        productId: ayam.product.id,
        purchaseItemId: ayamItemOne.id,
        supplierId: supBerkah.id,
        receivedDate: twoDaysAgo,
        expiryDate: expiryLater,
        initial: 300,
        remaining: 286,
        cost: 23000,
      });
      const bebekBatch = await createBatch({
        number: "TJ-BAT-20260809-0002",
        productId: bebek.product.id,
        purchaseItemId: bebekItem.id,
        supplierId: supBerkah.id,
        receivedDate: twoDaysAgo,
        expiryDate: expiryLater,
        initial: 120,
        remaining: 112,
        cost: 27000,
      });

      const purchaseTwo = await createPurchase({
        number: "TJ-PUR-20260810-0001",
        supplierId: supJaya.id,
        supplierName: supJaya.name,
        invoice: "JT-20260810-014",
        date: yesterday,
        dueDate: nextWeek,
        subtotal: 7260000,
        amountPaid: 3000000,
        status: PurchasePaymentStatus.PARTIAL,
      });
      const ayamItemTwo = await createPurchaseItem({
        purchaseId: purchaseTwo.id,
        productId: ayam.product.id,
        unitId: ayam.unit.id,
        quantity: 200,
        unitCost: 23500,
        expiryDate: expiryLater,
      });
      const kampungItem = await createPurchaseItem({
        purchaseId: purchaseTwo.id,
        productId: kampung.product.id,
        unitId: kampung.unit.id,
        quantity: 80,
        unitCost: 32000,
        expiryDate: expirySoon,
      });
      const ayamBatchTwo = await createBatch({
        number: "TJ-BAT-20260810-0001",
        productId: ayam.product.id,
        purchaseItemId: ayamItemTwo.id,
        supplierId: supJaya.id,
        receivedDate: yesterday,
        expiryDate: expiryLater,
        initial: 200,
        remaining: 200,
        cost: 23500,
      });
      const kampungBatch = await createBatch({
        number: "TJ-BAT-20260810-0002",
        productId: kampung.product.id,
        purchaseItemId: kampungItem.id,
        supplierId: supJaya.id,
        receivedDate: yesterday,
        expiryDate: expirySoon,
        initial: 80,
        remaining: 76,
        cost: 32000,
      });

      const purchaseThree = await createPurchase({
        number: "TJ-PUR-20260811-0001",
        supplierId: supSari.id,
        supplierName: supSari.name,
        invoice: "SU-20260811-006",
        date: today,
        dueDate: tomorrow,
        subtotal: 5850000,
        amountPaid: 0,
        status: PurchasePaymentStatus.UNPAID,
      });
      const puyuhItem = await createPurchaseItem({
        purchaseId: purchaseThree.id,
        productId: puyuh.product.id,
        unitId: puyuh.unit.id,
        quantity: 60,
        unitCost: 45000,
        expiryDate: expirySoon,
      });
      const omegaItem = await createPurchaseItem({
        purchaseId: purchaseThree.id,
        productId: omega.product.id,
        unitId: omega.unit.id,
        quantity: 90,
        unitCost: 35000,
        expiryDate: expiryLater,
      });
      const puyuhBatch = await createBatch({
        number: "TJ-BAT-20260811-0001",
        productId: puyuh.product.id,
        purchaseItemId: puyuhItem.id,
        supplierId: supSari.id,
        receivedDate: today,
        expiryDate: expirySoon,
        initial: 60,
        remaining: 58,
        cost: 45000,
      });
      const omegaBatch = await createBatch({
        number: "TJ-BAT-20260811-0002",
        productId: omega.product.id,
        purchaseItemId: omegaItem.id,
        supplierId: supSari.id,
        receivedDate: today,
        expiryDate: expiryLater,
        initial: 90,
        remaining: 90,
        cost: 35000,
      });

      await tx.purchasePayment.create({
        data: {
          paymentNumber: "TJ-PAY-20260809-0001",
          purchaseId: purchaseOne.id,
          paymentMethodId: transferMethod.id,
          paymentDate: twoDaysAgo,
          amount: money(10140000),
          referenceNumber: "TRF-BF-001",
          notes: "Pelunasan pembelian seed.",
          createdBy: owner.id,
        },
      });
      await tx.purchasePayment.create({
        data: {
          paymentNumber: "TJ-PAY-20260810-0001",
          purchaseId: purchaseTwo.id,
          paymentMethodId: transferMethod.id,
          paymentDate: yesterday,
          amount: money(3000000),
          referenceNumber: "TRF-JT-014",
          notes: "Pembayaran sebagian pembelian seed.",
          createdBy: owner.id,
        },
      });

      await createStockMovement({
        number: "TJ-STK-20260809-0001",
        productId: ayam.product.id,
        batchId: ayamBatchOne.id,
        type: StockMovementType.PURCHASE,
        inQty: 300,
        before: 0,
        after: 300,
        referenceType: "PURCHASE",
        referenceId: purchaseOne.id,
        description: "Seed pembelian telur ayam ras.",
        createdAt: twoDaysAgo,
      });
      await createStockMovement({
        number: "TJ-STK-20260809-0002",
        productId: bebek.product.id,
        batchId: bebekBatch.id,
        type: StockMovementType.PURCHASE,
        inQty: 120,
        before: 0,
        after: 120,
        referenceType: "PURCHASE",
        referenceId: purchaseOne.id,
        description: "Seed pembelian telur bebek.",
        createdAt: twoDaysAgo,
      });
      await createStockMovement({
        number: "TJ-STK-20260810-0001",
        productId: ayam.product.id,
        batchId: ayamBatchTwo.id,
        type: StockMovementType.PURCHASE,
        inQty: 200,
        before: 300,
        after: 500,
        referenceType: "PURCHASE",
        referenceId: purchaseTwo.id,
        description: "Seed pembelian telur ayam ras.",
        createdAt: yesterday,
      });
      await createStockMovement({
        number: "TJ-STK-20260810-0002",
        productId: kampung.product.id,
        batchId: kampungBatch.id,
        type: StockMovementType.PURCHASE,
        inQty: 80,
        before: 0,
        after: 80,
        referenceType: "PURCHASE",
        referenceId: purchaseTwo.id,
        description: "Seed pembelian telur ayam kampung.",
        createdAt: yesterday,
      });
      await createStockMovement({
        number: "TJ-STK-20260811-0001",
        productId: puyuh.product.id,
        batchId: puyuhBatch.id,
        type: StockMovementType.PURCHASE,
        inQty: 60,
        before: 0,
        after: 60,
        referenceType: "PURCHASE",
        referenceId: purchaseThree.id,
        description: "Seed pembelian telur puyuh.",
        createdAt: today,
      });
      await createStockMovement({
        number: "TJ-STK-20260811-0002",
        productId: omega.product.id,
        batchId: omegaBatch.id,
        type: StockMovementType.PURCHASE,
        inQty: 90,
        before: 0,
        after: 90,
        referenceType: "PURCHASE",
        referenceId: purchaseThree.id,
        description: "Seed pembelian telur omega.",
        createdAt: today,
      });

      const closedSession = await tx.cashSession.create({
        data: {
          sessionNumber: "TJ-SES-20260810-0001",
          cashRegisterId: cashRegister.id,
          cashierId: cashier.id,
          openedAt: new Date("2026-08-10T08:00:00+07:00"),
          openingCash: money(300000),
          closedAt: new Date("2026-08-10T20:00:00+07:00"),
          expectedCash: money(418000),
          actualCash: money(420000),
          cashDifference: money(2000),
          status: CashSessionStatus.CLOSED,
          notes: "Sesi contoh sudah ditutup.",
        },
      });
      const openSession = await tx.cashSession.create({
        data: {
          sessionNumber: "TJ-SES-20260811-0001",
          cashRegisterId: cashRegister.id,
          cashierId: cashier.id,
          openedAt: new Date("2026-08-11T08:00:00+07:00"),
          openingCash: money(500000),
          status: CashSessionStatus.OPEN,
          notes: "Sesi contoh aktif untuk mencoba menu kasir.",
        },
      });

      async function cashMovement(params: {
        sessionId: string;
        type: CashMovementType;
        amount: number;
        description: string;
        referenceType?: string;
        referenceId?: string;
        createdBy?: string;
        createdAt?: Date;
      }) {
        return tx.cashMovement.create({
          data: {
            cashSessionId: params.sessionId,
            movementType: params.type,
            amount: money(params.amount),
            description: params.description,
            referenceType: params.referenceType,
            referenceId: params.referenceId,
            createdBy: params.createdBy ?? cashier.id,
            createdAt: params.createdAt ?? now,
          },
        });
      }

      await cashMovement({
        sessionId: closedSession.id,
        type: CashMovementType.OPENING_CASH,
        amount: 300000,
        description: "Modal kas awal.",
        createdAt: new Date("2026-08-10T08:00:00+07:00"),
      });
      await cashMovement({
        sessionId: openSession.id,
        type: CashMovementType.OPENING_CASH,
        amount: 500000,
        description: "Modal kas awal.",
        createdAt: new Date("2026-08-11T08:00:00+07:00"),
      });

      async function createSale(params: {
        number: string;
        date: Date;
        customerId: string;
        sessionId: string;
        items: Array<{
          productId: string;
          unitId: string;
          name: string;
          qty: number;
          price: number;
          cost: number;
          batchId: string;
        }>;
        payments: Array<{ methodId: string; amount: number; reference?: string }>;
        printCount?: number;
      }) {
        const subtotal = params.items.reduce((total, item) => total + item.qty * item.price, 0);
        const totalCost = params.items.reduce((total, item) => total + item.qty * item.cost, 0);
        const sale = await tx.sale.create({
          data: {
            saleNumber: params.number,
            saleDate: params.date,
            customerId: params.customerId,
            cashierId: cashier.id,
            cashSessionId: params.sessionId,
            subtotal: money(subtotal),
            grandTotal: money(subtotal),
            amountPaid: money(subtotal),
            totalCost: money(totalCost),
            grossProfit: money(subtotal - totalCost),
            status: SaleStatus.COMPLETED,
            printCount: params.printCount ?? 1,
            lastPrintedAt: params.date,
            notes: "Transaksi contoh seed.",
          },
        });

        for (const item of params.items) {
          const saleItem = await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.productId,
              productUnitId: item.unitId,
              productNameSnapshot: item.name,
              unitNameSnapshot: "Kg",
              quantity: qty(item.qty),
              conversionToBase: "1.0000",
              baseQuantity: qty(item.qty),
              unitPrice: money(item.price),
              subtotal: money(item.qty * item.price),
              costAmount: money(item.qty * item.cost),
              profitAmount: money(item.qty * (item.price - item.cost)),
            },
          });
          await tx.saleBatchAllocation.create({
            data: {
              saleItemId: saleItem.id,
              inventoryBatchId: item.batchId,
              quantity: qty(item.qty),
              unitCost: money(item.cost),
              totalCost: money(item.qty * item.cost),
            },
          });
        }

        for (const payment of params.payments) {
          await tx.salePayment.create({
            data: {
              saleId: sale.id,
              paymentMethodId: payment.methodId,
              amount: money(payment.amount),
              referenceNumber: payment.reference,
              paidAt: params.date,
              createdBy: cashier.id,
            },
          });
        }

        return sale;
      }

      const saleYesterday = await createSale({
        number: "TJ-SAL-20260810-0001",
        date: new Date("2026-08-10T14:20:00+07:00"),
        customerId: retailCustomer.id,
        sessionId: closedSession.id,
        items: [
          {
            productId: kampung.product.id,
            unitId: kampung.unit.id,
            name: kampung.product.name,
            qty: 4,
            price: 42000,
            cost: 32000,
            batchId: kampungBatch.id,
          },
        ],
        payments: [{ methodId: cashMethod.id, amount: 168000 }],
      });
      const saleTodayOne = await createSale({
        number: "TJ-SAL-20260811-0001",
        date: new Date("2026-08-11T09:10:00+07:00"),
        customerId: defaultCustomer.id,
        sessionId: openSession.id,
        items: [
          {
            productId: ayam.product.id,
            unitId: ayam.unit.id,
            name: ayam.product.name,
            qty: 10,
            price: 28000,
            cost: 23000,
            batchId: ayamBatchOne.id,
          },
          {
            productId: bebek.product.id,
            unitId: bebek.unit.id,
            name: bebek.product.name,
            qty: 5,
            price: 34000,
            cost: 27000,
            batchId: bebekBatch.id,
          },
        ],
        payments: [
          { methodId: cashMethod.id, amount: 280000 },
          { methodId: qrisMethod.id, amount: 170000, reference: "QRIS-0901" },
        ],
      });
      const saleTodayTwo = await createSale({
        number: "TJ-SAL-20260811-0002",
        date: new Date("2026-08-11T11:35:00+07:00"),
        customerId: wholesaleCustomer.id,
        sessionId: openSession.id,
        items: [
          {
            productId: ayam.product.id,
            unitId: ayam.unit.id,
            name: ayam.product.name,
            qty: 3,
            price: 28000,
            cost: 23000,
            batchId: ayamBatchOne.id,
          },
          {
            productId: puyuh.product.id,
            unitId: puyuh.unit.id,
            name: puyuh.product.name,
            qty: 2,
            price: 55000,
            cost: 45000,
            batchId: puyuhBatch.id,
          },
        ],
        payments: [
          { methodId: cashMethod.id, amount: 84000 },
          { methodId: transferMethod.id, amount: 110000, reference: "TRF-CUS-0002" },
        ],
      });

      await createStockMovement({
        number: "TJ-STK-20260810-0003",
        productId: kampung.product.id,
        batchId: kampungBatch.id,
        type: StockMovementType.SALE,
        outQty: 4,
        before: 80,
        after: 76,
        referenceType: "SALE",
        referenceId: saleYesterday.id,
        description: "Seed penjualan telur ayam kampung.",
        createdAt: saleYesterday.saleDate,
      });
      await createStockMovement({
        number: "TJ-STK-20260811-0003",
        productId: ayam.product.id,
        batchId: ayamBatchOne.id,
        type: StockMovementType.SALE,
        outQty: 10,
        before: 500,
        after: 490,
        referenceType: "SALE",
        referenceId: saleTodayOne.id,
        description: "Seed penjualan telur ayam ras.",
        createdAt: saleTodayOne.saleDate,
      });
      await createStockMovement({
        number: "TJ-STK-20260811-0004",
        productId: bebek.product.id,
        batchId: bebekBatch.id,
        type: StockMovementType.SALE,
        outQty: 5,
        before: 120,
        after: 115,
        referenceType: "SALE",
        referenceId: saleTodayOne.id,
        description: "Seed penjualan telur bebek.",
        createdAt: saleTodayOne.saleDate,
      });
      await createStockMovement({
        number: "TJ-STK-20260811-0005",
        productId: ayam.product.id,
        batchId: ayamBatchOne.id,
        type: StockMovementType.SALE,
        outQty: 3,
        before: 490,
        after: 487,
        referenceType: "SALE",
        referenceId: saleTodayTwo.id,
        description: "Seed penjualan telur ayam ras.",
        createdAt: saleTodayTwo.saleDate,
      });
      await createStockMovement({
        number: "TJ-STK-20260811-0006",
        productId: puyuh.product.id,
        batchId: puyuhBatch.id,
        type: StockMovementType.SALE,
        outQty: 2,
        before: 60,
        after: 58,
        referenceType: "SALE",
        referenceId: saleTodayTwo.id,
        description: "Seed penjualan telur puyuh.",
        createdAt: saleTodayTwo.saleDate,
      });

      await cashMovement({
        sessionId: closedSession.id,
        type: CashMovementType.SALE_CASH,
        amount: 168000,
        description: "Pembayaran tunai penjualan TJ-SAL-20260810-0001.",
        referenceType: "SALE",
        referenceId: saleYesterday.id,
        createdAt: saleYesterday.saleDate,
      });
      await cashMovement({
        sessionId: openSession.id,
        type: CashMovementType.SALE_CASH,
        amount: 280000,
        description: "Pembayaran tunai penjualan TJ-SAL-20260811-0001.",
        referenceType: "SALE",
        referenceId: saleTodayOne.id,
        createdAt: saleTodayOne.saleDate,
      });
      await cashMovement({
        sessionId: openSession.id,
        type: CashMovementType.SALE_CASH,
        amount: 84000,
        description: "Pembayaran tunai penjualan TJ-SAL-20260811-0002.",
        referenceType: "SALE",
        referenceId: saleTodayTwo.id,
        createdAt: saleTodayTwo.saleDate,
      });

      const saleReturn = await tx.saleReturn.create({
        data: {
          returnNumber: "TJ-SRT-20260811-0001",
          saleId: saleTodayOne.id,
          returnDate: today,
          reason: SaleReturnReason.CUSTOMER_CHANGED_MIND,
          totalAmount: money(28000),
          refundMethod: SaleRefundMethod.CASH_REFUND,
          status: ReturnStatus.COMPLETED,
          approvedBy: owner.id,
          createdBy: cashier.id,
          notes: "Retur contoh 1 kg telur ayam ras.",
        },
      });
      const saleOneAyamItem = await tx.saleItem.findFirstOrThrow({
        where: { saleId: saleTodayOne.id, productId: ayam.product.id },
      });
      await tx.saleReturnItem.create({
        data: {
          saleReturnId: saleReturn.id,
          saleItemId: saleOneAyamItem.id,
          productId: ayam.product.id,
          quantity: qty(1),
          unitPrice: money(28000),
          subtotal: money(28000),
        },
      });
      await createStockMovement({
        number: "TJ-STK-20260811-0007",
        productId: ayam.product.id,
        batchId: ayamBatchOne.id,
        type: StockMovementType.SALE_RETURN,
        inQty: 1,
        before: 487,
        after: 488,
        referenceType: "SALE_RETURN",
        referenceId: saleReturn.id,
        description: "Seed retur penjualan telur ayam ras.",
      });
      await cashMovement({
        sessionId: openSession.id,
        type: CashMovementType.REFUND_CASH,
        amount: 28000,
        description: "Refund tunai retur TJ-SRT-20260811-0001.",
        referenceType: "SALE_RETURN",
        referenceId: saleReturn.id,
      });

      const damage = await tx.stockDamage.create({
        data: {
          damageNumber: "TJ-DMG-20260811-0001",
          productId: ayam.product.id,
          inventoryBatchId: ayamBatchOne.id,
          damageDate: today,
          damageType: StockDamageType.BROKEN,
          quantity: qty(2),
          unitCost: money(23000),
          lossAmount: money(46000),
          notes: "Telur pecah saat bongkar stok.",
          createdBy: owner.id,
        },
      });
      await createStockMovement({
        number: "TJ-STK-20260810-0004",
        productId: ayam.product.id,
        batchId: ayamBatchOne.id,
        type: StockMovementType.DAMAGE,
        outQty: 2,
        before: 488,
        after: 486,
        referenceType: "STOCK_DAMAGE",
        referenceId: damage.id,
        description: "Seed stok rusak telur ayam ras.",
      });

      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          returnNumber: "TJ-PRT-20260810-0001",
          purchaseId: purchaseOne.id,
          supplierId: supBerkah.id,
          returnDate: yesterday,
          reason: PurchaseReturnReason.DAMAGED,
          totalAmount: money(81000),
          refundMethod: PurchaseRefundMethod.CASH_REFUND,
          status: ReturnStatus.COMPLETED,
          notes: "Retur contoh 3 kg telur bebek rusak.",
          createdBy: owner.id,
        },
      });
      await tx.purchaseReturnItem.create({
        data: {
          purchaseReturnId: purchaseReturn.id,
          purchaseItemId: bebekItem.id,
          inventoryBatchId: bebekBatch.id,
          productId: bebek.product.id,
          quantity: qty(3),
          unitCost: money(27000),
          subtotal: money(81000),
        },
      });
      await createStockMovement({
        number: "TJ-STK-20260811-0008",
        productId: bebek.product.id,
        batchId: bebekBatch.id,
        type: StockMovementType.PURCHASE_RETURN,
        outQty: 3,
        before: 115,
        after: 112,
        referenceType: "PURCHASE_RETURN",
        referenceId: purchaseReturn.id,
        description: "Seed retur pembelian telur bebek.",
      });

      const expenseCashMovement = await cashMovement({
        sessionId: openSession.id,
        type: CashMovementType.CASH_OUT,
        amount: 35000,
        description: "Beli plastik dan tray telur.",
        referenceType: "EXPENSE",
        createdBy: owner.id,
      });
      await tx.expense.create({
        data: {
          expenseNumber: "TJ-EXP-20260811-0001",
          expenseCategoryId: packagingCategory.id,
          expenseDate: today,
          amount: money(35000),
          paymentMethodId: cashMethod.id,
          description: "Beli plastik dan tray telur.",
          cashMovementId: expenseCashMovement.id,
          createdBy: owner.id,
        },
      });
      const yesterdayExpenseMovement = await cashMovement({
        sessionId: closedSession.id,
        type: CashMovementType.CASH_OUT,
        amount: 50000,
        description: "Uang makan karyawan harian.",
        referenceType: "EXPENSE",
        createdBy: owner.id,
        createdAt: new Date("2026-08-10T18:00:00+07:00"),
      });
      await tx.expense.create({
        data: {
          expenseNumber: "TJ-EXP-20260810-0001",
          expenseCategoryId: salaryCategory.id,
          expenseDate: yesterday,
          amount: money(50000),
          paymentMethodId: cashMethod.id,
          description: "Uang makan karyawan harian.",
          cashMovementId: yesterdayExpenseMovement.id,
          createdBy: owner.id,
        },
      });
      const incomeMovement = await cashMovement({
        sessionId: openSession.id,
        type: CashMovementType.CASH_IN,
        amount: 100000,
        description: "Penjualan kardus bekas.",
        referenceType: "OTHER_INCOME",
        createdBy: owner.id,
      });
      await tx.otherIncome.create({
        data: {
          incomeNumber: "TJ-INC-20260811-0001",
          incomeDate: today,
          incomeType: "Penjualan kardus bekas",
          amount: money(100000),
          paymentMethodId: cashMethod.id,
          description: "Penjualan kardus bekas dari pengiriman supplier.",
          cashMovementId: incomeMovement.id,
          createdBy: owner.id,
        },
      });

      await tx.notification.createMany({
        data: [
          {
            userId: owner.id,
            type: NotificationType.SUPPLIER_DEBT_DUE,
            title: "Seed: Hutang supplier jatuh tempo",
            message: "Pembelian TJ-PUR-20260811-0001 jatuh tempo pada 12 Agustus 2026.",
            referenceType: "PURCHASE",
            referenceId: purchaseThree.id,
          },
          {
            userId: owner.id,
            type: NotificationType.BATCH_NEAR_EXPIRY,
            title: "Seed: Batch dekat kedaluwarsa",
            message: "Batch telur ayam kampung dan telur puyuh mendekati tanggal kedaluwarsa.",
            referenceType: "INVENTORY_BATCH",
            referenceId: kampungBatch.id,
          },
          {
            userId: owner.id,
            type: NotificationType.CASH_DIFFERENCE,
            title: "Seed: Selisih kas sesi kemarin",
            message: "Sesi TJ-SES-20260810-0001 memiliki selisih kas Rp 2.000.",
            referenceType: "CASH_SESSION",
            referenceId: closedSession.id,
          },
          {
            userId: cashier.id,
            type: NotificationType.RETURN_PENDING_APPROVAL,
            title: "Seed: Retur penjualan selesai",
            message: "Retur TJ-SRT-20260811-0001 sudah dibuat sebagai data contoh.",
            referenceType: "SALE_RETURN",
            referenceId: saleReturn.id,
            isRead: true,
          },
        ],
      });

      return {
        owner,
        cashier,
        cashierTwo,
        customers: [defaultCustomer, retailCustomer, wholesaleCustomer].length,
        paymentMethods: [cashMethod, qrisMethod, transferMethod, debitMethod].length,
        cashRegisters: [cashRegister, backupRegister].length,
        expenseCategories: [opsCategory, salaryCategory, packagingCategory].length,
        categories: [catAyam, catBebek, catPuyuh, catPremium].length,
        suppliers: [supBerkah, supJaya, supSari].length,
        products: [ayam, kampung, bebek, puyuh, omega].length,
        purchases: seedPurchaseNumbers.length,
        sales: seedSaleNumbers.length,
        sessions: seedSessionNumbers.length,
      };
    });

    console.info("Seed database berhasil:");
    console.info(`- USER: ${result.owner.username}, ${result.cashier.username}, ${result.cashierTwo.username}`);
    console.info(`- MASTER: ${result.categories} kategori, ${result.products} produk, ${result.suppliers} supplier`);
    console.info(`- PELANGGAN/METODE/KASIR: ${result.customers} pelanggan, ${result.paymentMethods} metode, ${result.cashRegisters} register`);
    console.info(`- TRANSAKSI: ${result.purchases} pembelian, ${result.sales} penjualan, ${result.sessions} sesi kasir`);
    console.info("Password tidak ditampilkan. Gunakan nilai dari environment seed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Seed database gagal.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
