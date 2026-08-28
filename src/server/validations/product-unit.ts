import { z } from "zod";

import {
  optionalWholesalePriceSchema,
  sellingPriceSchema,
} from "@/server/validations/product-price";

const checkbox = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

const conversionToBase = z
  .string()
  .trim()
  .min(1, "Faktor konversi wajib diisi.")
  .regex(
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,4})?$/,
    "Faktor konversi maksimal 4 angka desimal.",
  )
  .refine((value) => Number(value) > 0, "Faktor konversi harus lebih besar dari 0.");

const optionalBarcode = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(100, "Barcode maksimal 100 karakter.").optional(),
);

export const productUnitFormSchema = z.object({
  productId: z.string().uuid("Produk tidak valid."),
  unitName: z
    .string()
    .trim()
    .min(1, "Nama satuan wajib diisi.")
    .max(30, "Nama satuan maksimal 30 karakter."),
  conversionToBase,
  sellingPrice: sellingPriceSchema,
  wholesalePrice: optionalWholesalePriceSchema,
  barcode: optionalBarcode,
  isBaseUnit: checkbox,
  isActive: checkbox,
});

export const productUnitIdSchema = z.string().uuid("ID satuan produk tidak valid.");

export type ProductUnitFormInput = z.infer<typeof productUnitFormSchema>;

export function getProductUnitFormInput(formData: FormData) {
  return {
    productId: formData.get("productId"),
    unitName: formData.get("unitName"),
    conversionToBase: formData.get("conversionToBase"),
    sellingPrice: formData.get("sellingPrice"),
    wholesalePrice: formData.get("wholesalePrice"),
    barcode: formData.get("barcode"),
    isBaseUnit: formData.get("isBaseUnit"),
    isActive: formData.get("isActive"),
  };
}
