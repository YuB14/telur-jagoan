import { z } from "zod";

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid.")
  .refine(
    (value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
    "Tanggal tidak valid.",
  );

const optionalDateSchema = z.preprocess(
  (value) =>
    value == null || (typeof value === "string" && value.trim() === "")
      ? undefined
      : value,
  dateSchema.optional(),
);

const optionalText = (maximum: number, message: string) =>
  z.preprocess(
    (value) =>
      value == null || (typeof value === "string" && value.trim() === "")
        ? undefined
        : value,
    z.string().trim().max(maximum, message).optional(),
  );

const quantitySchema = z
  .string()
  .trim()
  .min(1, "Jumlah wajib diisi.")
  .regex(/^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/, "Jumlah maksimal 3 angka desimal.")
  .refine((value) => Number(value) > 0, "Jumlah harus lebih besar dari 0.");

const positiveMoneySchema = z
  .string()
  .trim()
  .min(1, "Harga beli wajib diisi.")
  .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, "Nilai maksimal 2 angka desimal.")
  .refine((value) => Number(value) > 0, "Harga beli harus lebih besar dari 0.");

const nonNegativeMoneySchema = z
  .string()
  .trim()
  .min(1, "Nilai wajib diisi.")
  .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, "Nilai maksimal 2 angka desimal.");

const optionalUuid = z.preprocess(
  (value) =>
    value == null || (typeof value === "string" && value.trim() === "")
      ? undefined
      : value,
  z.string().uuid("Metode pembayaran tidak valid.").optional(),
);

export const purchaseItemSchema = z.object({
  productUnitId: z.string().uuid("Satuan produk tidak valid."),
  quantity: quantitySchema,
  unitCost: positiveMoneySchema,
  discountAmount: nonNegativeMoneySchema,
  expiryDate: optionalDateSchema,
});

const itemsJsonSchema = z
  .string()
  .min(1, "Minimal satu item pembelian wajib diisi.")
  .transform((value, context) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: "custom", message: "Data item pembelian tidak valid." });
      return z.NEVER;
    }
  })
  .pipe(z.array(purchaseItemSchema).min(1, "Minimal satu item wajib diisi.").max(100));

export const purchaseDraftFormSchema = z
  .object({
    supplierName: z.string().trim().min(1, "Nama supplier wajib diisi.").max(150, "Nama supplier maksimal 150 karakter."),
    purchaseNumberMode: z.enum(["AUTO", "MANUAL"], { error: "Mode nomor pembelian tidak valid." }),
    customPurchaseNumber: optionalText(50, "Nomor pembelian maksimal 50 karakter."),
    supplierInvoiceNumber: optionalText(100, "Nomor nota maksimal 100 karakter."),
    purchaseDate: dateSchema,
    dueDate: optionalDateSchema,
    discountAmount: nonNegativeMoneySchema,
    shippingCost: nonNegativeMoneySchema,
    otherCost: nonNegativeMoneySchema,
    paymentMode: z.enum(["PAID", "DEBT"], { error: "Status pembayaran tidak valid." }),
    amountPaid: nonNegativeMoneySchema,
    paymentMethodId: optionalUuid,
    referenceNumber: optionalText(100, "Nomor referensi maksimal 100 karakter."),
    paymentNotes: optionalText(5_000, "Catatan pembayaran maksimal 5.000 karakter."),
    notes: optionalText(5_000, "Catatan maksimal 5.000 karakter."),
    items: itemsJsonSchema,
  })
  .superRefine((input, context) => {
    if (input.purchaseNumberMode === "MANUAL" && !input.customPurchaseNumber) {
      context.addIssue({
        code: "custom",
        path: ["customPurchaseNumber"],
        message: "Nomor pembelian wajib diisi jika memakai nomor manual.",
      });
    }

    if (input.dueDate && input.dueDate < input.purchaseDate) {
      context.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Jatuh tempo tidak boleh sebelum tanggal pembelian.",
      });
    }

    if (input.paymentMode === "PAID" && input.dueDate) {
      context.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Pembelian lunas tidak memakai tanggal jatuh tempo.",
      });
    }

    if (input.paymentMode === "DEBT" && !input.dueDate) {
      context.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Tanggal jatuh tempo wajib diisi untuk hutang.",
      });
    }

    if (input.paymentMode === "PAID" && !input.paymentMethodId) {
      context.addIssue({
        code: "custom",
        path: ["paymentMethodId"],
        message: "Metode pembayaran wajib dipilih untuk pembelian lunas.",
      });
    }

    if (input.paymentMode === "DEBT" && Number(input.amountPaid) > 0 && !input.paymentMethodId) {
      context.addIssue({
        code: "custom",
        path: ["paymentMethodId"],
        message: "Metode pembayaran wajib dipilih jika ada pembayaran awal.",
      });
    }
  });

export type PurchaseDraftFormInput = z.infer<typeof purchaseDraftFormSchema>;
export const purchaseIdSchema = z.string().uuid("ID pembelian tidak valid.");

export const purchaseReceiptFormSchema = z
  .object({
    paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"], {
      error: "Status pembayaran tidak valid.",
    }),
    amountPaid: nonNegativeMoneySchema,
    paymentMethodId: optionalUuid,
    dueDate: optionalDateSchema,
    referenceNumber: optionalText(100, "Nomor referensi maksimal 100 karakter."),
    paymentNotes: optionalText(5_000, "Catatan pembayaran maksimal 5.000 karakter."),
  })
  .superRefine((input, context) => {
    const amount = Number(input.amountPaid);

    if (input.paymentStatus === "UNPAID" && amount !== 0) {
      context.addIssue({
        code: "custom",
        path: ["amountPaid"],
        message: "Pembayaran tempo harus bernilai 0.",
      });
    }

    if (input.paymentStatus !== "UNPAID" && amount <= 0) {
      context.addIssue({
        code: "custom",
        path: ["amountPaid"],
        message: "Jumlah pembayaran harus lebih besar dari 0.",
      });
    }

    if (input.paymentStatus !== "UNPAID" && !input.paymentMethodId) {
      context.addIssue({
        code: "custom",
        path: ["paymentMethodId"],
        message: "Metode pembayaran wajib dipilih.",
      });
    }
  });

export type PurchaseReceiptFormInput = z.infer<typeof purchaseReceiptFormSchema>;

export const supplierDebtPaymentFormSchema = z.object({
  paymentDate: dateSchema,
  amount: positiveMoneySchema,
  paymentMethodId: z.string().uuid("Metode pembayaran tidak valid."),
  referenceNumber: optionalText(100, "Nomor referensi maksimal 100 karakter."),
  receiptUrl: optionalText(2_000, "URL bukti maksimal 2.000 karakter."),
  notes: optionalText(5_000, "Catatan pembayaran maksimal 5.000 karakter."),
});

export type SupplierDebtPaymentFormInput = z.infer<typeof supplierDebtPaymentFormSchema>;

export const purchaseReturnItemSchema = z.object({
  purchaseItemId: z.string().uuid("Item pembelian tidak valid."),
  inventoryBatchId: z.string().uuid("Batch tidak valid."),
  quantity: quantitySchema,
});

const returnItemsJsonSchema = z
  .string()
  .min(1, "Minimal satu item retur wajib diisi.")
  .transform((value, context) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: "custom", message: "Data item retur tidak valid." });
      return z.NEVER;
    }
  })
  .pipe(z.array(purchaseReturnItemSchema).min(1, "Minimal satu item retur wajib diisi.").max(100));

export const purchaseReturnFormSchema = z.object({
  reason: z.enum(["DAMAGED", "WRONG_ITEM", "EXPIRED", "OTHER"], {
    error: "Alasan retur pembelian tidak valid.",
  }),
  refundMethod: z.enum(["CASH_REFUND", "DEDUCT_FROM_DEBT", "SUPPLIER_CREDIT"], {
    error: "Metode pengembalian tidak valid.",
  }),
  notes: optionalText(1_000, "Catatan retur maksimal 1.000 karakter."),
  items: returnItemsJsonSchema,
});

export type PurchaseReturnFormInput = z.infer<typeof purchaseReturnFormSchema>;

export function getSupplierDebtPaymentFormInput(formData: FormData) {
  return {
    paymentDate: formData.get("paymentDate"),
    amount: formData.get("amount"),
    paymentMethodId: formData.get("paymentMethodId"),
    referenceNumber: formData.get("referenceNumber"),
    receiptUrl: formData.get("receiptUrl"),
    notes: formData.get("notes"),
  };
}

export function getPurchaseReceiptFormInput(formData: FormData) {
  return {
    paymentStatus: formData.get("paymentStatus"),
    amountPaid: formData.get("amountPaid"),
    paymentMethodId: formData.get("paymentMethodId"),
    dueDate: formData.get("dueDate"),
    referenceNumber: formData.get("referenceNumber"),
    paymentNotes: formData.get("paymentNotes"),
  };
}

export function getPurchaseReturnFormInput(formData: FormData) {
  return {
    reason: formData.get("reason"),
    refundMethod: formData.get("refundMethod"),
    notes: formData.get("notes"),
    items: formData.get("items"),
  };
}

export function getPurchaseDraftFormInput(formData: FormData) {
  return {
    supplierName: formData.get("supplierName"),
    purchaseNumberMode: formData.get("purchaseNumberMode"),
    customPurchaseNumber: formData.get("customPurchaseNumber"),
    supplierInvoiceNumber: formData.get("supplierInvoiceNumber"),
    purchaseDate: formData.get("purchaseDate"),
    dueDate: formData.get("dueDate"),
    discountAmount: formData.get("discountAmount"),
    shippingCost: formData.get("shippingCost"),
    otherCost: formData.get("otherCost"),
    paymentMode: formData.get("paymentMode"),
    amountPaid: formData.get("amountPaid"),
    paymentMethodId: formData.get("paymentMethodId"),
    referenceNumber: formData.get("referenceNumber"),
    paymentNotes: formData.get("paymentNotes"),
    notes: formData.get("notes"),
    items: formData.get("items"),
  };
}
