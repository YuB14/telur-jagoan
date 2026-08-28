import { z } from "zod";

const decimalMoneySchema = z
  .string()
  .trim()
  .min(1, "Nominal pembayaran wajib diisi.")
  .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, "Nominal maksimal 12 digit dan 2 angka desimal.")
  .refine((value) => Number(value) > 0, "Nominal pembayaran harus lebih besar dari 0.");

const quantitySchema = z
  .string()
  .trim()
  .min(1, "Jumlah wajib diisi.")
  .regex(/^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/, "Jumlah maksimal 3 angka desimal.")
  .refine((value) => Number(value) > 0, "Jumlah harus lebih besar dari 0.");

const optionalText = (maximum: number, message: string) =>
  z.preprocess(
    (value) =>
      value == null || (typeof value === "string" && value.trim() === "")
        ? undefined
        : value,
    z.string().trim().max(maximum, message).optional(),
  );

const jsonSchema = z.string().min(1, "Data checkout wajib diisi.").transform((value, context) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    context.addIssue({ code: "custom", message: "Data checkout tidak valid." });
    return z.NEVER;
  }
});

export const posCheckoutItemSchema = z.object({
  productId: z.string().uuid("Produk tidak valid."),
  productUnitId: z.string().uuid("Satuan produk tidak valid."),
  quantity: quantitySchema,
});

export const posCheckoutPaymentSchema = z.object({
  paymentMethodId: z.string().uuid("Metode pembayaran tidak valid."),
  amount: decimalMoneySchema,
  referenceNumber: optionalText(100, "Referensi pembayaran maksimal 100 karakter."),
});

export const posCheckoutFormSchema = z.object({
  items: jsonSchema.pipe(z.array(posCheckoutItemSchema).min(1, "Keranjang wajib berisi minimal satu item.").max(100)),
  payments: jsonSchema.pipe(z.array(posCheckoutPaymentSchema).min(1, "Minimal satu pembayaran wajib diisi.").max(5)),
  discountAmount: z
    .string()
    .trim()
    .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, "Diskon maksimal 12 digit dan 2 angka desimal.")
    .optional()
    .default("0"),
  notes: optionalText(1_000, "Catatan maksimal 1.000 karakter."),
});

export type PosCheckoutFormInput = z.infer<typeof posCheckoutFormSchema>;

export function getPosCheckoutFormInput(formData: FormData) {
  return {
    items: formData.get("items"),
    payments: formData.get("payments"),
    discountAmount: formData.get("discountAmount") || "0",
    notes: formData.get("notes"),
  };
}
