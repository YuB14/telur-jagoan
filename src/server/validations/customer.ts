import { z } from "zod";

const checkbox = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

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

const optionalAddress = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(5_000, "Alamat maksimal 5.000 karakter.").optional(),
);

export const customerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama pelanggan wajib diisi.")
    .max(150, "Nama pelanggan maksimal 150 karakter."),
  phone: optionalPhone,
  address: optionalAddress,
  customerType: z.enum(["GENERAL", "RETAIL", "WHOLESALE"], {
    error: "Jenis pelanggan tidak valid.",
  }),
  isActive: checkbox,
});

export const customerIdSchema = z.string().uuid("ID pelanggan tidak valid.");

export type CustomerFormInput = z.infer<typeof customerFormSchema>;

export function getCustomerFormInput(formData: FormData) {
  return {
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    customerType: formData.get("customerType"),
    isActive: formData.get("isActive"),
  };
}
