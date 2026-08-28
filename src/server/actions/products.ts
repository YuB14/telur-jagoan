"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/services/authorization";
import {
  archiveProduct,
  createProduct,
  ProductServiceError,
  recordProductDamage,
  updateProduct,
} from "@/server/services/products";
import {
  getProductDamageFormInput,
  getProductFormInput,
  getProductImageFile,
  productDamageFormSchema,
  productFormSchema,
  productImageFileSchema,
  productIdSchema,
} from "@/server/validations/product";

export type ProductActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function getSafeActionError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof ProductServiceError) {
    return error.message;
  }

  return "Data produk belum dapat disimpan. Silakan coba lagi.";
}

export async function createProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const parsed = productFormSchema.safeParse(getProductFormInput(formData));
  const parsedImage = productImageFileSchema.safeParse(getProductImageFile(formData));

  if (!parsed.success || !parsedImage.success) {
    return {
      message: "Periksa kembali data produk.",
      errors: {
        ...(!parsed.success ? parsed.error.flatten().fieldErrors : {}),
        ...(!parsedImage.success
          ? { image: parsedImage.error.issues.map((issue) => issue.message) }
          : {}),
      },
    };
  }

  try {
    await createProduct(parsed.data, parsedImage.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/produk");
  redirect("/produk?success=created");
}

export async function updateProductAction(
  id: string,
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const parsedId = productIdSchema.safeParse(id);
  const parsed = productFormSchema.safeParse(getProductFormInput(formData));
  const parsedImage = productImageFileSchema.safeParse(getProductImageFile(formData));

  if (!parsedId.success) {
    return { message: "ID produk tidak valid." };
  }

  if (!parsed.success || !parsedImage.success) {
    return {
      message: "Periksa kembali data produk.",
      errors: {
        ...(!parsed.success ? parsed.error.flatten().fieldErrors : {}),
        ...(!parsedImage.success
          ? { image: parsedImage.error.issues.map((issue) => issue.message) }
          : {}),
      },
    };
  }

  try {
    await updateProduct(
      parsedId.data,
      parsed.data,
      parsedImage.data,
      parsed.data.removeImage,
    );
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/produk");
  redirect("/produk?success=updated");
}

export async function archiveProductAction(id: string) {
  const parsedId = productIdSchema.safeParse(id);
  let errorMessage: string | undefined;

  if (!parsedId.success) {
    errorMessage = "ID produk tidak valid.";
  } else {
    try {
      await archiveProduct(parsedId.data);
    } catch (error) {
      errorMessage = getSafeActionError(error);
    }
  }

  if (errorMessage) {
    redirect(`/produk?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/produk");
  redirect("/produk?success=archived");
}

export async function recordProductDamageAction(
  id: string,
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const parsedId = productIdSchema.safeParse(id);
  const parsed = productDamageFormSchema.safeParse(getProductDamageFormInput(formData));

  if (!parsedId.success) return { message: "ID produk tidak valid." };
  if (!parsed.success) {
    return {
      message: "Periksa kembali data kerusakan.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let result: Awaited<ReturnType<typeof recordProductDamage>>;
  try {
    result = await recordProductDamage(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/produk");
  revalidatePath(`/produk/${parsedId.data}`);
  redirect(
    `/produk?success=damaged&product=${encodeURIComponent(result.productName)}&quantity=${encodeURIComponent(result.quantity)}`,
  );
}
