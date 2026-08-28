import { z } from "zod";

import {
  MAX_PRODUCT_IMAGE_BYTES,
} from "@/lib/product-image";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid("Kategori produk tidak valid.").optional(),
);

const checkbox = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

const positiveMoney = z
  .string()
  .trim()
  .min(1, "Harga per kg wajib diisi.")
  .regex(
    /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/,
    "Harga per kg harus berupa angka positif dengan maksimal 2 angka desimal.",
  )
  .refine((value) => Number(value) > 0, "Harga per kg harus lebih besar dari 0.");

export const productFormSchema = z.object({
  productCode: z
    .string()
    .trim()
    .min(1, "Kode produk wajib diisi.")
    .max(30, "Kode produk maksimal 30 karakter.")
    .regex(/^[A-Za-z0-9._-]+$/, "Kode produk hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung."),
  categoryId: optionalUuid,
  name: z.string().trim().min(1, "Nama produk wajib diisi.").max(150, "Nama produk maksimal 150 karakter."),
  pricePerKg: positiveMoney,
  description: optionalText(5_000),
  isActive: checkbox,
  removeImage: checkbox,
});

export const productIdSchema = z.string().uuid("ID produk tidak valid.");

export const productImageFileSchema = z.preprocess(
  (value) => (value instanceof File && value.size === 0 ? undefined : value),
  z
    .instanceof(File, { error: "File gambar tidak valid." })
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "Gambar harus berformat JPG, PNG, atau WebP.",
    )
    .refine(
      (file) => file.size <= MAX_PRODUCT_IMAGE_BYTES,
      "Ukuran gambar maksimal 5MB.",
    )
    .optional(),
);

export type ProductFormInput = z.infer<typeof productFormSchema>;

const damageQuantity = z
  .string()
  .trim()
  .min(1, "Jumlah rusak wajib diisi.")
  .regex(/^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/, "Jumlah maksimal 3 angka desimal.")
  .refine((value) => Number(value) > 0, "Jumlah rusak harus lebih besar dari 0.");

export const productDamageFormSchema = z.object({
  quantity: damageQuantity,
  damageType: z.enum(["BROKEN", "ROTTEN", "EXPIRED", "LOST", "OTHER"], {
    error: "Jenis kerusakan tidak valid.",
  }),
  notes: optionalText(1_000),
});

export type ProductDamageFormInput = z.infer<typeof productDamageFormSchema>;

export function getProductFormInput(formData: FormData) {
  return {
    productCode: formData.get("productCode"),
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    pricePerKg: formData.get("pricePerKg"),
    description: formData.get("description"),
    isActive: formData.get("isActive"),
    removeImage: formData.get("removeImage"),
  };
}

export function getProductImageFile(formData: FormData) {
  return formData.get("image");
}

export function getProductDamageFormInput(formData: FormData) {
  return {
    quantity: formData.get("quantity"),
    damageType: formData.get("damageType"),
    notes: formData.get("notes"),
  };
}
