import { z } from "zod";

const optionalText = (maximum: number, message: string) =>
  z.preprocess(
    (value) =>
      value == null || (typeof value === "string" && value.trim() === "")
        ? undefined
        : value,
    z.string().trim().max(maximum, message).optional(),
  );

const requiredText = (maximum: number, required: string, message: string) =>
  z.string().trim().min(1, required).max(maximum, message);

const quantitySchema = z
  .string()
  .trim()
  .min(1, "Jumlah retur wajib diisi.")
  .regex(/^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/, "Jumlah maksimal 3 angka desimal.")
  .refine((value) => Number(value) > 0, "Jumlah retur harus lebih besar dari 0.");

export const saleIdSchema = z.string().uuid("ID penjualan tidak valid.");

export const cancelSaleFormSchema = z.object({
  reason: requiredText(
    1_000,
    "Alasan pembatalan wajib diisi.",
    "Alasan pembatalan maksimal 1.000 karakter.",
  ),
});

export type CancelSaleFormInput = z.infer<typeof cancelSaleFormSchema>;

export const saleReturnItemSchema = z.object({
  saleItemId: z.string().uuid("Item penjualan tidak valid."),
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
  .pipe(z.array(saleReturnItemSchema).min(1, "Minimal satu item retur wajib diisi.").max(100));

export const saleReturnFormSchema = z.object({
  reason: z.enum(["DAMAGED", "WRONG_ITEM", "CUSTOMER_CHANGED_MIND", "OTHER"], {
    error: "Alasan retur tidak valid.",
  }),
  notes: optionalText(1_000, "Catatan retur maksimal 1.000 karakter."),
  items: returnItemsJsonSchema,
});

export type SaleReturnFormInput = z.infer<typeof saleReturnFormSchema>;

export function getCancelSaleFormInput(formData: FormData) {
  return {
    reason: formData.get("reason"),
  };
}

export function getSaleReturnFormInput(formData: FormData) {
  return {
    reason: formData.get("reason"),
    notes: formData.get("notes"),
    items: formData.get("items"),
  };
}
