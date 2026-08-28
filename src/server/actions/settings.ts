"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/services/authorization";
import {
  createCashier,
  createManualBackup,
  deactivateCashier,
  SettingsServiceError,
  updateCashier,
  updateReceiptSettings,
} from "@/server/services/settings";
import {
  cashierFormSchema,
  cashierIdSchema,
  getCashierFormInput,
  getReceiptSettingsFormInput,
  newCashierFormSchema,
  receiptSettingsFormSchema,
} from "@/server/validations/settings";

export type SettingsActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function safeError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof SettingsServiceError) {
    return error.message;
  }
  return "Data pengaturan belum dapat disimpan. Silakan coba lagi.";
}

export async function createCashierAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = newCashierFormSchema.safeParse(getCashierFormInput(formData));
  if (!parsed.success) {
    return { message: "Periksa kembali data kasir.", errors: parsed.error.flatten().fieldErrors };
  }
  try {
    await createCashier(parsed.data);
  } catch (error) {
    return { message: safeError(error) };
  }
  revalidatePath("/pengguna/kasir");
  redirect("/pengguna/kasir?success=created");
}

export async function updateCashierAction(
  id: string,
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsedId = cashierIdSchema.safeParse(id);
  const parsed = cashierFormSchema.safeParse(getCashierFormInput(formData));
  if (!parsedId.success) return { message: "ID kasir tidak valid." };
  if (!parsed.success) {
    return { message: "Periksa kembali data kasir.", errors: parsed.error.flatten().fieldErrors };
  }
  try {
    await updateCashier(parsedId.data, parsed.data);
  } catch (error) {
    return { message: safeError(error) };
  }
  revalidatePath("/pengguna/kasir");
  redirect("/pengguna/kasir?success=updated");
}

export async function deactivateCashierAction(id: string) {
  const parsedId = cashierIdSchema.safeParse(id);
  let errorMessage: string | undefined;
  if (!parsedId.success) {
    errorMessage = "ID kasir tidak valid.";
  } else {
    try {
      await deactivateCashier(parsedId.data);
    } catch (error) {
      errorMessage = safeError(error);
    }
  }
  if (errorMessage) redirect(`/pengguna/kasir?error=${encodeURIComponent(errorMessage)}`);
  revalidatePath("/pengguna/kasir");
  redirect("/pengguna/kasir?success=deactivated");
}

export async function updateReceiptSettingsAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = receiptSettingsFormSchema.safeParse(getReceiptSettingsFormInput(formData));
  if (!parsed.success) {
    return { message: "Periksa kembali pengaturan struk.", errors: parsed.error.flatten().fieldErrors };
  }
  try {
    await updateReceiptSettings(parsed.data);
  } catch (error) {
    return { message: safeError(error) };
  }
  revalidatePath("/pengaturan/struk");
  redirect("/pengaturan/struk?success=updated");
}

export async function createManualBackupAction() {
  try {
    await createManualBackup();
  } catch (error) {
    redirect(`/pengaturan/backup?error=${encodeURIComponent(safeError(error))}`);
  }
  revalidatePath("/pengaturan/backup");
  redirect("/pengaturan/backup?success=created");
}
