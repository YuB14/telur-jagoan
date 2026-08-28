"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/services/authorization";
import {
  createPurchase,
  createPurchaseReturn,
  paySupplierDebt,
  PurchaseServiceError,
  receivePurchase,
} from "@/server/services/purchases";
import { savePurchaseReceiptFile } from "@/server/services/purchase-receipt-storage";
import {
  getPurchaseDraftFormInput,
  getPurchaseReceiptFormInput,
  getPurchaseReturnFormInput,
  getSupplierDebtPaymentFormInput,
  purchaseIdSchema,
  purchaseDraftFormSchema,
  purchaseReceiptFormSchema,
  purchaseReturnFormSchema,
  supplierDebtPaymentFormSchema,
} from "@/server/validations/purchase";

export type PurchaseActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function getSafeActionError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof PurchaseServiceError) {
    return error.message;
  }

  return "Transaksi pembelian belum dapat diproses. Silakan coba lagi.";
}

export async function createPurchaseDraftAction(
  _previousState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const parsed = purchaseDraftFormSchema.safeParse(getPurchaseDraftFormInput(formData));

  if (!parsed.success) {
    return {
      message: "Periksa kembali data pembelian.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let purchaseNumber: string;
  let result: Awaited<ReturnType<typeof createPurchase>>;

  try {
    const receiptFile = formData.get("receiptFile");
    const receiptUrl = receiptFile instanceof File
      ? await savePurchaseReceiptFile(receiptFile)
      : null;
    result = await createPurchase({ ...parsed.data, receiptUrl });
    purchaseNumber = result.purchaseNumber;
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/pembelian");
  redirect(`/pembelian?success=created&number=${encodeURIComponent(purchaseNumber)}`);
}

export async function receivePurchaseAction(
  id: string,
  _previousState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const parsedId = purchaseIdSchema.safeParse(id);
  const parsed = purchaseReceiptFormSchema.safeParse(getPurchaseReceiptFormInput(formData));

  if (!parsedId.success) {
    return { message: "ID pembelian tidak valid." };
  }
  if (!parsed.success) {
    return {
      message: "Periksa kembali data pembayaran.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let result: Awaited<ReturnType<typeof receivePurchase>>;
  try {
    result = await receivePurchase(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/pembelian");
  revalidatePath("/produk");
  redirect(
    `/pembelian?success=received&number=${encodeURIComponent(result.purchaseNumber)}&batches=${result.batchCount}&payment=${result.paymentStatus}`,
  );
}

export async function paySupplierDebtAction(
  id: string,
  _previousState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const parsedId = purchaseIdSchema.safeParse(id);
  const parsed = supplierDebtPaymentFormSchema.safeParse(
    getSupplierDebtPaymentFormInput(formData),
  );

  if (!parsedId.success) return { message: "ID pembelian tidak valid." };
  if (!parsed.success) {
    return {
      message: "Periksa kembali data pembayaran hutang.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let result: Awaited<ReturnType<typeof paySupplierDebt>>;
  try {
    const receiptFile = formData.get("receiptFile");
    const receiptUrl = receiptFile instanceof File
      ? await savePurchaseReceiptFile(receiptFile)
      : null;
    result = await paySupplierDebt(parsedId.data, {
      ...parsed.data,
      receiptUrl: receiptUrl ?? undefined,
    });
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/pembelian");
  revalidatePath("/pembelian/hutang");
  revalidatePath("/pembelian/pembayaran");
  redirect(
    `/pembelian/hutang?success=paid&purchase=${encodeURIComponent(result.purchaseNumber)}&payment=${encodeURIComponent(result.paymentNumber)}&status=${result.paymentStatus}`,
  );
}

export async function createPurchaseReturnAction(
  id: string,
  _previousState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const parsedId = purchaseIdSchema.safeParse(id);
  const parsed = purchaseReturnFormSchema.safeParse(getPurchaseReturnFormInput(formData));

  if (!parsedId.success) return { message: "ID pembelian tidak valid." };
  if (!parsed.success) {
    return {
      message: "Periksa kembali data retur pembelian.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let result: Awaited<ReturnType<typeof createPurchaseReturn>>;
  try {
    result = await createPurchaseReturn(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/pembelian");
  revalidatePath("/produk");
  redirect(
    `/pembelian?success=returned&number=${encodeURIComponent(result.purchaseNumber)}&return=${encodeURIComponent(result.returnNumber)}`,
  );
}
