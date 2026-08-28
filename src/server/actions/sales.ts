"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cancelSale,
  createSaleReturn,
  recordSaleReceiptPrint,
  SaleServiceError,
} from "@/server/services/sales";
import { AuthorizationError } from "@/server/services/authorization";
import {
  cancelSaleFormSchema,
  getCancelSaleFormInput,
  getSaleReturnFormInput,
  saleIdSchema,
  saleReturnFormSchema,
} from "@/server/validations/sales";

export type SaleActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function getSafeActionError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof SaleServiceError) {
    return error.message;
  }

  return "Aksi penjualan belum dapat diproses. Silakan coba lagi.";
}

export async function printSaleReceiptAction(formData: FormData) {
  const parsedId = saleIdSchema.safeParse(formData.get("saleId"));

  if (!parsedId.success) {
    redirect("/penjualan?error=ID%20penjualan%20tidak%20valid");
  }

  try {
    await recordSaleReceiptPrint(parsedId.data);
  } catch (error) {
    redirect(`/penjualan?error=${encodeURIComponent(getSafeActionError(error))}`);
  }

  revalidatePath("/penjualan");
  redirect(`/penjualan/${parsedId.data}/print`);
}

export async function cancelSaleAction(
  id: string,
  _previousState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const parsedId = saleIdSchema.safeParse(id);
  const parsed = cancelSaleFormSchema.safeParse(getCancelSaleFormInput(formData));

  if (!parsedId.success) return { message: "ID penjualan tidak valid." };
  if (!parsed.success) {
    return {
      message: "Periksa kembali pembatalan penjualan.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let result: Awaited<ReturnType<typeof cancelSale>>;
  try {
    result = await cancelSale(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/penjualan");
  redirect(`/penjualan?success=cancelled&number=${encodeURIComponent(result.saleNumber)}`);
}

export async function createSaleReturnAction(
  id: string,
  _previousState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const parsedId = saleIdSchema.safeParse(id);
  const parsed = saleReturnFormSchema.safeParse(getSaleReturnFormInput(formData));

  if (!parsedId.success) return { message: "ID penjualan tidak valid." };
  if (!parsed.success) {
    return {
      message: "Periksa kembali data retur.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let result: Awaited<ReturnType<typeof createSaleReturn>>;
  try {
    result = await createSaleReturn(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/penjualan");
  redirect(
    `/penjualan?success=returned&number=${encodeURIComponent(result.saleNumber)}&return=${encodeURIComponent(result.returnNumber)}`,
  );
}
