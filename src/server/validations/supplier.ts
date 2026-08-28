import { z } from "zod";

const checkbox = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

function optionalText(maxLength: number, message: string) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maxLength, message).optional(),
  );
}

const optionalPhone = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .regex(
      /^(?:08\d{7,13}|\+62\d{7,13})$/,
      "Nomor telepon harus diawali 08 atau +62 dan berisi 9–15 digit.",
    )
    .optional(),
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .max(150, "Email maksimal 150 karakter.")
    .email("Format email tidak valid.")
    .optional(),
);

export const supplierFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama supplier wajib diisi.")
    .max(150, "Nama supplier maksimal 150 karakter."),
  contactPerson: optionalText(150, "Nama kontak maksimal 150 karakter."),
  phone: optionalPhone,
  email: optionalEmail,
  address: optionalText(5_000, "Alamat maksimal 5.000 karakter."),
  notes: optionalText(5_000, "Catatan maksimal 5.000 karakter."),
  isActive: checkbox,
});

export const supplierIdSchema = z.string().uuid("ID supplier tidak valid.");

export type SupplierFormInput = z.infer<typeof supplierFormSchema>;

export function getSupplierFormInput(formData: FormData) {
  return {
    name: formData.get("name"),
    contactPerson: formData.get("contactPerson"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    notes: formData.get("notes"),
    isActive: formData.get("isActive"),
  };
}
