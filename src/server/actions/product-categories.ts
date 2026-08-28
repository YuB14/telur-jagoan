"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/services/authorization";
import {
  archiveProductCategory,
  createProductCategory,
  ProductCategoryServiceError,
  updateProductCategory,
} from "@/server/services/product-categories";
import {
  getProductCategoryFormInput,
  productCategoryFormSchema,
  productCategoryIdSchema,
} from "@/server/validations/product-category";

export type ProductCategoryActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function getSafeActionError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof ProductCategoryServiceError) {
    return error.message;
  }

  return "Data kategori belum dapat disimpan. Silakan coba lagi.";
}

export async function createProductCategoryAction(
  _previousState: ProductCategoryActionState,
  formData: FormData,
): Promise<ProductCategoryActionState> {
  const parsed = productCategoryFormSchema.safeParse(getProductCategoryFormInput(formData));

  if (!parsed.success) {
    return {
      message: "Periksa kembali data kategori.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createProductCategory(parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/produk/kategori");
  revalidatePath("/produk/baru");
  redirect("/produk/kategori?success=created");
}

export async function updateProductCategoryAction(
  id: string,
  _previousState: ProductCategoryActionState,
  formData: FormData,
): Promise<ProductCategoryActionState> {
  const parsedId = productCategoryIdSchema.safeParse(id);
  const parsed = productCategoryFormSchema.safeParse(getProductCategoryFormInput(formData));

  if (!parsedId.success) {
    return { message: "ID kategori tidak valid." };
  }

  if (!parsed.success) {
    return {
      message: "Periksa kembali data kategori.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateProductCategory(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/produk/kategori");
  revalidatePath("/produk/baru");
  redirect("/produk/kategori?success=updated");
}

export async function archiveProductCategoryAction(id: string) {
  const parsedId = productCategoryIdSchema.safeParse(id);
  let errorMessage: string | undefined;

  if (!parsedId.success) {
    errorMessage = "ID kategori tidak valid.";
  } else {
    try {
      await archiveProductCategory(parsedId.data);
    } catch (error) {
      errorMessage = getSafeActionError(error);
    }
  }

  if (errorMessage) {
    redirect(`/produk/kategori?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/produk/kategori");
  revalidatePath("/produk/baru");
  redirect("/produk/kategori?success=archived");
}
