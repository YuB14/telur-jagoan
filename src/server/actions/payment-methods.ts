"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/services/authorization";
import {
  archivePaymentMethod,
  createPaymentMethod,
  PaymentMethodServiceError,
  updatePaymentMethod,
} from "@/server/services/payment-methods";
import {
  getPaymentMethodFormInput,
  paymentMethodFormSchema,
  paymentMethodIdSchema,
} from "@/server/validations/payment-method";

export type PaymentMethodActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function getSafeActionError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof PaymentMethodServiceError) {
    return error.message;
  }

  return "Metode pembayaran belum dapat disimpan. Silakan coba lagi.";
}

export async function createPaymentMethodAction(
  _previousState: PaymentMethodActionState,
  formData: FormData,
): Promise<PaymentMethodActionState> {
  const parsed = paymentMethodFormSchema.safeParse(getPaymentMethodFormInput(formData));

  if (!parsed.success) {
    return {
      message: "Periksa kembali data metode pembayaran.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createPaymentMethod(parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/pengaturan/metode-pembayaran");
  redirect("/pengaturan/metode-pembayaran?success=created");
}

export async function updatePaymentMethodAction(
  id: string,
  _previousState: PaymentMethodActionState,
  formData: FormData,
): Promise<PaymentMethodActionState> {
  const parsedId = paymentMethodIdSchema.safeParse(id);
  const parsed = paymentMethodFormSchema.safeParse(getPaymentMethodFormInput(formData));

  if (!parsedId.success) {
    return { message: "ID metode pembayaran tidak valid." };
  }

  if (!parsed.success) {
    return {
      message: "Periksa kembali data metode pembayaran.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updatePaymentMethod(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/pengaturan/metode-pembayaran");
  redirect("/pengaturan/metode-pembayaran?success=updated");
}

export async function archivePaymentMethodAction(id: string) {
  const parsedId = paymentMethodIdSchema.safeParse(id);
  let errorMessage: string | undefined;

  if (!parsedId.success) {
    errorMessage = "ID metode pembayaran tidak valid.";
  } else {
    try {
      await archivePaymentMethod(parsedId.data);
    } catch (error) {
      errorMessage = getSafeActionError(error);
    }
  }

  if (errorMessage) {
    redirect(`/pengaturan/metode-pembayaran?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/pengaturan/metode-pembayaran");
  redirect("/pengaturan/metode-pembayaran?success=archived");
}
