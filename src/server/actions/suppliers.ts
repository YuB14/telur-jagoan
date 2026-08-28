"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/services/authorization";
import {
  archiveSupplier,
  createSupplier,
  SupplierServiceError,
  updateSupplier,
} from "@/server/services/suppliers";
import {
  getSupplierFormInput,
  supplierFormSchema,
  supplierIdSchema,
} from "@/server/validations/supplier";

export type SupplierActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function getSafeActionError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof SupplierServiceError) {
    return error.message;
  }

  return "Data supplier belum dapat disimpan. Silakan coba lagi.";
}

export async function createSupplierAction(
  _previousState: SupplierActionState,
  formData: FormData,
): Promise<SupplierActionState> {
  const parsed = supplierFormSchema.safeParse(getSupplierFormInput(formData));

  if (!parsed.success) {
    return {
      message: "Periksa kembali data supplier.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createSupplier(parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/supplier");
  redirect("/supplier?success=created");
}

export async function updateSupplierAction(
  id: string,
  _previousState: SupplierActionState,
  formData: FormData,
): Promise<SupplierActionState> {
  const parsedId = supplierIdSchema.safeParse(id);
  const parsed = supplierFormSchema.safeParse(getSupplierFormInput(formData));

  if (!parsedId.success) {
    return { message: "ID supplier tidak valid." };
  }

  if (!parsed.success) {
    return {
      message: "Periksa kembali data supplier.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateSupplier(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/supplier");
  redirect("/supplier?success=updated");
}

export async function archiveSupplierAction(id: string) {
  const parsedId = supplierIdSchema.safeParse(id);
  let errorMessage: string | undefined;

  if (!parsedId.success) {
    errorMessage = "ID supplier tidak valid.";
  } else {
    try {
      await archiveSupplier(parsedId.data);
    } catch (error) {
      errorMessage = getSafeActionError(error);
    }
  }

  if (errorMessage) {
    redirect(`/supplier?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/supplier");
  redirect("/supplier?success=archived");
}
