import { z } from "zod";

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional();

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:08|\+62)[0-9]{7,13}$/, "Nomor telepon harus format Indonesia.")
  .optional()
  .or(z.literal(""));

export const cashierIdSchema = z.string().uuid("ID kasir tidak valid.");

export const cashierFormSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi.").max(255, "Nama maksimal 255 karakter."),
    username: z
      .string()
      .trim()
      .min(3, "Username minimal 3 karakter.")
      .max(100, "Username maksimal 100 karakter.")
      .regex(/^[A-Za-z0-9._-]+$/, "Username hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung."),
    email: z.string().trim().email("Email tidak valid.").max(255, "Email maksimal 255 karakter."),
    phone: z.string().trim().regex(/^(?:08|\+62)[0-9]{7,13}$/, "Nomor telepon harus format Indonesia."),
    password: z.string().max(255, "Password maksimal 255 karakter.").optional(),
    isActive: z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean()),
  })
  .superRefine((value, context) => {
    if (value.password !== undefined && value.password.length > 0 && value.password.length < 8) {
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password minimal 8 karakter.",
      });
    }
  });

export const newCashierFormSchema = cashierFormSchema.superRefine((value, context) => {
  if (!value.password || value.password.length < 8) {
    context.addIssue({
      code: "custom",
      path: ["password"],
      message: "Password wajib diisi minimal 8 karakter.",
    });
  }
});

export const receiptSettingsFormSchema = z.object({
  storeName: z.string().trim().min(1, "Nama toko wajib diisi.").max(150, "Nama toko maksimal 150 karakter."),
  address: optionalText(2000, "Alamat maksimal 2000 karakter."),
  phone: phoneSchema,
  receiptFooter: optionalText(1000, "Footer maksimal 1000 karakter."),
  logo: z
    .instanceof(File, { message: "Pilih file logo yang valid." })
    .optional()
    .refine((file) => !file || file.size <= 5 * 1024 * 1024, "Ukuran file logo maksimal 5MB.")
    .refine(
      (file) => !file || ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "Format logo hanya JPG, PNG, atau WebP.",
    ),
  removeLogo: z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean()).optional(),
});

export type CashierFormInput = z.infer<typeof cashierFormSchema>;
export type ReceiptSettingsFormInput = z.infer<typeof receiptSettingsFormSchema>;

export function getCashierFormInput(formData: FormData) {
  return {
    name: formData.get("name"),
    username: formData.get("username"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password") || undefined,
    isActive: formData.get("isActive"),
  };
}

export function getReceiptSettingsFormInput(formData: FormData) {
  const logoEntry = formData.get("logo");
  const logoFile = logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : undefined;

  return {
    storeName: formData.get("storeName"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    receiptFooter: formData.get("receiptFooter") || undefined,
    logo: logoFile,
    removeLogo: formData.get("removeLogo"),
  };
}
