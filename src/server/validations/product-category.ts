import { z } from "zod";

export const productCategoryFormSchema = z.object({
  categoryCode: z
    .string()
    .trim()
    .min(1, "Kode kategori wajib diisi.")
    .max(30, "Kode kategori maksimal 30 karakter.")
    .regex(/^[A-Za-z0-9._-]+$/, "Kode kategori hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung."),
  name: z
    .string()
    .trim()
    .min(1, "Nama kategori wajib diisi.")
    .max(150, "Nama kategori maksimal 150 karakter."),
});

export const productCategoryIdSchema = z.string().uuid("ID kategori tidak valid.");

export type ProductCategoryFormInput = z.infer<typeof productCategoryFormSchema>;

export function getProductCategoryFormInput(formData: FormData) {
  return {
    categoryCode: formData.get("categoryCode"),
    name: formData.get("name"),
  };
}
