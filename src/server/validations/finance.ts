import { z } from "zod";

const idSchema = z.string().uuid("ID tidak valid.");
const moneySchema = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, "Nominal tidak valid.")
  .refine((value) => Number(value) > 0, "Nominal harus lebih dari 0.");

export const financeEntryIdSchema = idSchema;

export const expenseCategoryFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode kategori wajib diisi.")
    .max(30, "Kode maksimal 30 karakter.")
    .regex(/^[A-Za-z0-9._-]+$/, "Kode hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung."),
  name: z.string().trim().min(1, "Nama kategori wajib diisi.").max(150, "Nama maksimal 150 karakter."),
  description: z.string().trim().max(1000, "Deskripsi maksimal 1000 karakter.").optional(),
});

const baseFinanceEntrySchema = z.object({
  date: z.coerce.date({ error: "Tanggal wajib diisi." }),
  amount: moneySchema,
  paymentMethodId: idSchema,
  description: z.string().trim().min(1, "Keterangan wajib diisi.").max(2000, "Keterangan maksimal 2000 karakter."),
});

export const expenseFormSchema = baseFinanceEntrySchema.extend({
  expenseCategoryId: idSchema,
  receiptUrl: z.string().trim().max(2000, "URL bukti maksimal 2000 karakter.").optional(),
});

export const incomeFormSchema = baseFinanceEntrySchema.extend({
  incomeType: z.string().trim().min(1, "Jenis pemasukan wajib diisi.").max(100, "Jenis maksimal 100 karakter."),
});

export type ExpenseCategoryFormInput = z.infer<typeof expenseCategoryFormSchema>;
export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;
export type IncomeFormInput = z.infer<typeof incomeFormSchema>;

export function getExpenseCategoryFormInput(formData: FormData) {
  return {
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  };
}

export function getExpenseFormInput(formData: FormData) {
  return {
    date: formData.get("date"),
    amount: formData.get("amount"),
    paymentMethodId: formData.get("paymentMethodId"),
    description: formData.get("description"),
    expenseCategoryId: formData.get("expenseCategoryId"),
    receiptUrl: formData.get("receiptUrl") || undefined,
  };
}

export function getIncomeFormInput(formData: FormData) {
  return {
    date: formData.get("date"),
    amount: formData.get("amount"),
    paymentMethodId: formData.get("paymentMethodId"),
    description: formData.get("description"),
    incomeType: formData.get("incomeType"),
  };
}
