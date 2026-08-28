import { z } from "zod";

const openingCashSchema = z
  .string()
  .trim()
  .min(1, "Modal awal wajib diisi.")
  .regex(
    /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/,
    "Modal awal maksimal 12 digit dan 2 angka desimal.",
  );

const optionalNotesSchema = z.preprocess(
  (value) =>
    value == null || (typeof value === "string" && value.trim() === "")
      ? undefined
      : value,
  z.string().trim().max(5_000, "Catatan maksimal 5.000 karakter.").optional(),
);

export const openCashSessionFormSchema = z.object({
  cashRegisterId: z.string().uuid("Perangkat kasir tidak valid."),
  openingCash: openingCashSchema,
  notes: optionalNotesSchema,
});

export type OpenCashSessionFormInput = z.infer<typeof openCashSessionFormSchema>;

export const closeCashSessionFormSchema = z.object({
  actualCash: openingCashSchema,
  notes: optionalNotesSchema,
});

export type CloseCashSessionFormInput = z.infer<typeof closeCashSessionFormSchema>;

export function getOpenCashSessionFormInput(formData: FormData) {
  return {
    cashRegisterId: formData.get("cashRegisterId"),
    openingCash: formData.get("openingCash"),
    notes: formData.get("notes"),
  };
}

export function getCloseCashSessionFormInput(formData: FormData) {
  return {
    actualCash: formData.get("actualCash"),
    notes: formData.get("notes"),
  };
}
