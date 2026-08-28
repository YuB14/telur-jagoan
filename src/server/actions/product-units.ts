"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/services/authorization";
import {
  archiveProductUnit,
  createProductUnit,
  ProductUnitServiceError,
  updateProductUnit,
} from "@/server/services/product-units";
import {
  getProductUnitFormInput,
  productUnitFormSchema,
  productUnitIdSchema,
} from "@/server/validations/product-unit";

export type ProductUnitActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function getSafeActionError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof ProductUnitServiceError) {
    return error.message;
  }

  return "Data satuan produk belum dapat disimpan. Silakan coba lagi.";
}

export async function createProductUnitAction(
  _previousState: ProductUnitActionState,
  formData: FormData,
): Promise<ProductUnitActionState> {
  const parsed = productUnitFormSchema.safeParse(getProductUnitFormInput(formData));

  if (!parsed.success) {
    return {
      message: "Periksa kembali data satuan produk.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createProductUnit(parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/produk/satuan");
  redirect("/produk/satuan?success=created");
}

export async function updateProductUnitAction(
  id: string,
  _previousState: ProductUnitActionState,
  formData: FormData,
): Promise<ProductUnitActionState> {
  const parsedId = productUnitIdSchema.safeParse(id);
  const parsed = productUnitFormSchema.safeParse(getProductUnitFormInput(formData));

  if (!parsedId.success) {
    return { message: "ID satuan produk tidak valid." };
  }

  if (!parsed.success) {
    return {
      message: "Periksa kembali data satuan produk.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateProductUnit(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/produk/satuan");
  redirect("/produk/satuan?success=updated");
}

export async function archiveProductUnitAction(id: string) {
  const parsedId = productUnitIdSchema.safeParse(id);
  let errorMessage: string | undefined;

  if (!parsedId.success) {
    errorMessage = "ID satuan produk tidak valid.";
  } else {
    try {
      await archiveProductUnit(parsedId.data);
    } catch (error) {
      errorMessage = getSafeActionError(error);
    }
  }

  if (errorMessage) {
    redirect(`/produk/satuan?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/produk/satuan");
  redirect("/produk/satuan?success=archived");
}
