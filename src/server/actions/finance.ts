"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/services/authorization";
import {
  createExpense,
  createOtherIncome,
  deleteExpense,
  deleteOtherIncome,
  FinanceServiceError,
  updateExpense,
  updateOtherIncome,
} from "@/server/services/finance";
import {
  expenseFormSchema,
  financeEntryIdSchema,
  getExpenseFormInput,
  getIncomeFormInput,
  incomeFormSchema,
} from "@/server/validations/finance";

export type FinanceActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function getSafeActionError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof FinanceServiceError) {
    return error.message;
  }

  return "Transaksi keuangan belum dapat disimpan. Silakan coba lagi.";
}

function revalidateFinancePaths() {
  revalidatePath("/keuangan");
  revalidatePath("/keuangan/pemasukan");
  revalidatePath("/keuangan/pengeluaran");
}

export async function createExpenseAction(
  _previousState: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const parsed = expenseFormSchema.safeParse(getExpenseFormInput(formData));

  if (!parsed.success) {
    return {
      message: "Periksa kembali data pengeluaran.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createExpense(parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidateFinancePaths();
  redirect("/keuangan/pengeluaran?success=created");
}

export async function updateExpenseAction(
  id: string,
  _previousState: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const parsedId = financeEntryIdSchema.safeParse(id);
  const parsed = expenseFormSchema.safeParse(getExpenseFormInput(formData));

  if (!parsedId.success) return { message: "ID pengeluaran tidak valid." };
  if (!parsed.success) {
    return {
      message: "Periksa kembali data pengeluaran.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateExpense(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidateFinancePaths();
  redirect(`/keuangan/pengeluaran/${id}?success=updated`);
}

export async function deleteExpenseAction(id: string) {
  const parsedId = financeEntryIdSchema.safeParse(id);
  let errorMessage: string | undefined;

  if (!parsedId.success) {
    errorMessage = "ID pengeluaran tidak valid.";
  } else {
    try {
      await deleteExpense(parsedId.data);
    } catch (error) {
      errorMessage = getSafeActionError(error);
    }
  }

  if (errorMessage) {
    redirect(`/keuangan/pengeluaran?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidateFinancePaths();
  redirect("/keuangan/pengeluaran?success=deleted");
}

export async function createIncomeAction(
  _previousState: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const parsed = incomeFormSchema.safeParse(getIncomeFormInput(formData));

  if (!parsed.success) {
    return {
      message: "Periksa kembali data pemasukan.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createOtherIncome(parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidateFinancePaths();
  redirect("/keuangan/pemasukan?success=created");
}

export async function updateIncomeAction(
  id: string,
  _previousState: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const parsedId = financeEntryIdSchema.safeParse(id);
  const parsed = incomeFormSchema.safeParse(getIncomeFormInput(formData));

  if (!parsedId.success) return { message: "ID pemasukan tidak valid." };
  if (!parsed.success) {
    return {
      message: "Periksa kembali data pemasukan.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateOtherIncome(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidateFinancePaths();
  redirect(`/keuangan/pemasukan/${id}?success=updated`);
}

export async function deleteIncomeAction(id: string) {
  const parsedId = financeEntryIdSchema.safeParse(id);
  let errorMessage: string | undefined;

  if (!parsedId.success) {
    errorMessage = "ID pemasukan tidak valid.";
  } else {
    try {
      await deleteOtherIncome(parsedId.data);
    } catch (error) {
      errorMessage = getSafeActionError(error);
    }
  }

  if (errorMessage) {
    redirect(`/keuangan/pemasukan?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidateFinancePaths();
  redirect("/keuangan/pemasukan?success=deleted");
}
