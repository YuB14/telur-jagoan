"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/services/authorization";
import {
  CashSessionServiceError,
  closeCashSession,
  openCashSession,
} from "@/server/services/cash-sessions";
import {
  closeCashSessionFormSchema,
  getCloseCashSessionFormInput,
  getOpenCashSessionFormInput,
  openCashSessionFormSchema,
} from "@/server/validations/cash-session";

export type CashSessionActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export async function openCashSessionAction(
  _previousState: CashSessionActionState,
  formData: FormData,
): Promise<CashSessionActionState> {
  const parsed = openCashSessionFormSchema.safeParse(getOpenCashSessionFormInput(formData));

  if (!parsed.success) {
    return {
      message: "Periksa kembali data pembukaan sesi.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let sessionNumber: string;
  try {
    const cashSession = await openCashSession(parsed.data);
    sessionNumber = cashSession.sessionNumber;
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof CashSessionServiceError) {
      return { message: error.message };
    }
    return { message: "Sesi kasir belum dapat dibuka. Silakan coba lagi." };
  }

  revalidatePath("/kasir");
  revalidatePath("/kasir/buka");
  redirect(`/kasir/buka?success=opened&number=${encodeURIComponent(sessionNumber)}`);
}

export async function closeCashSessionAction(
  _previousState: CashSessionActionState,
  formData: FormData,
): Promise<CashSessionActionState> {
  const parsed = closeCashSessionFormSchema.safeParse(getCloseCashSessionFormInput(formData));

  if (!parsed.success) {
    return {
      message: "Periksa kembali data penutupan sesi.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let sessionNumber: string;
  try {
    const cashSession = await closeCashSession(parsed.data);
    sessionNumber = cashSession.sessionNumber;
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof CashSessionServiceError) {
      return { message: error.message };
    }
    return { message: "Sesi kasir belum dapat ditutup. Silakan coba lagi." };
  }

  revalidatePath("/kasir");
  revalidatePath("/kasir/tutup");
  revalidatePath("/laporan/kasir");
  redirect(`/kasir/tutup?success=closed&number=${encodeURIComponent(sessionNumber)}`);
}
