"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/services/authorization";
import {
  ProductPriceServiceError,
  updateProductPrice,
} from "@/server/services/product-prices";
import {
  getProductPriceFormInput,
  productPriceFormSchema,
  productPriceUnitIdSchema,
} from "@/server/validations/product-price";

export type ProductPriceActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function getSafeActionError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof ProductPriceServiceError) {
    return error.message;
  }

  return "Harga produk belum dapat disimpan. Silakan coba lagi.";
}

export async function updateProductPriceAction(
  id: string,
  _previousState: ProductPriceActionState,
  formData: FormData,
): Promise<ProductPriceActionState> {
  const parsedId = productPriceUnitIdSchema.safeParse(id);
  const parsed = productPriceFormSchema.safeParse(getProductPriceFormInput(formData));

  if (!parsedId.success) {
    return { message: "ID satuan produk tidak valid." };
  }

  if (!parsed.success) {
    return {
      message: "Periksa kembali harga produk.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateProductPrice(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/produk/harga");
  revalidatePath("/produk/satuan");
  redirect("/produk/harga?success=updated");
}
