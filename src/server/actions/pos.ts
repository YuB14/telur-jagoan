"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createPosSale, PosServiceError } from "@/server/services/pos";
import { AuthorizationError } from "@/server/services/authorization";
import {
  getPosCheckoutFormInput,
  posCheckoutFormSchema,
} from "@/server/validations/pos";

export type PosCheckoutActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function getSafePosActionError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof PosServiceError) {
    return error.message;
  }

  return "Transaksi belum dapat disimpan. Silakan coba lagi.";
}

export async function createPosSaleAction(
  _previousState: PosCheckoutActionState,
  formData: FormData,
): Promise<PosCheckoutActionState> {
  const parsed = posCheckoutFormSchema.safeParse(getPosCheckoutFormInput(formData));

  if (!parsed.success) {
    return {
      message: "Periksa kembali transaksi dan pembayaran.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let saleId: string;
  try {
    const sale = await createPosSale(parsed.data);
    saleId = sale.id;
  } catch (error) {
    return { message: getSafePosActionError(error) };
  }

  revalidatePath("/kasir");
  revalidatePath("/kasir/transaksi-baru");
  revalidatePath("/penjualan");
  redirect(`/penjualan/${saleId}/print`);
}
