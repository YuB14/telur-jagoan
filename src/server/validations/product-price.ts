import { z } from "zod";

export const sellingPriceSchema = z
  .string()
  .trim()
  .min(1, "Harga jual wajib diisi.")
  .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, "Format harga jual tidak valid.")
  .refine((value) => Number(value) > 0, "Harga jual harus lebih besar dari 0.");

export const optionalWholesalePriceSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, "Format harga grosir tidak valid.")
    .refine((value) => Number(value) > 0, "Harga grosir harus lebih besar dari 0.")
    .optional(),
);

export const productPriceFormSchema = z.object({
  sellingPrice: sellingPriceSchema,
  wholesalePrice: optionalWholesalePriceSchema,
});

export const productPriceUnitIdSchema = z.string().uuid("ID satuan produk tidak valid.");

export type ProductPriceFormInput = z.infer<typeof productPriceFormSchema>;

export function getProductPriceFormInput(formData: FormData) {
  return {
    sellingPrice: formData.get("sellingPrice"),
    wholesalePrice: formData.get("wholesalePrice"),
  };
}
