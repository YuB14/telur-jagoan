import { z } from "zod";

const checkbox = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

export const paymentMethodFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode metode pembayaran wajib diisi.")
    .max(30, "Kode metode pembayaran maksimal 30 karakter.")
    .regex(
      /^[A-Za-z0-9._-]+$/,
      "Kode hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung.",
    ),
  name: z
    .string()
    .trim()
    .min(1, "Nama metode pembayaran wajib diisi.")
    .max(100, "Nama metode pembayaran maksimal 100 karakter."),
  type: z.enum(["CASH", "QRIS", "TRANSFER", "DEBIT_CARD", "OTHER"], {
    error: "Jenis metode pembayaran tidak valid.",
  }),
  isActive: checkbox,
});

export const paymentMethodIdSchema = z.string().uuid("ID metode pembayaran tidak valid.");

export type PaymentMethodFormInput = z.infer<typeof paymentMethodFormSchema>;

export function getPaymentMethodFormInput(formData: FormData) {
  return {
    code: formData.get("code"),
    name: formData.get("name"),
    type: formData.get("type"),
    isActive: formData.get("isActive"),
  };
}
