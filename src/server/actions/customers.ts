"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/server/services/authorization";
import {
  archiveCustomer,
  createCustomer,
  CustomerServiceError,
  updateCustomer,
} from "@/server/services/customers";
import {
  customerFormSchema,
  customerIdSchema,
  getCustomerFormInput,
} from "@/server/validations/customer";

export type CustomerActionState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

function getSafeActionError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof CustomerServiceError) {
    return error.message;
  }

  return "Data pelanggan belum dapat disimpan. Silakan coba lagi.";
}

export async function createCustomerAction(
  _previousState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const parsed = customerFormSchema.safeParse(getCustomerFormInput(formData));

  if (!parsed.success) {
    return {
      message: "Periksa kembali data pelanggan.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createCustomer(parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/pelanggan");
  redirect("/pelanggan?success=created");
}

export async function updateCustomerAction(
  id: string,
  _previousState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const parsedId = customerIdSchema.safeParse(id);
  const parsed = customerFormSchema.safeParse(getCustomerFormInput(formData));

  if (!parsedId.success) {
    return { message: "ID pelanggan tidak valid." };
  }

  if (!parsed.success) {
    return {
      message: "Periksa kembali data pelanggan.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateCustomer(parsedId.data, parsed.data);
  } catch (error) {
    return { message: getSafeActionError(error) };
  }

  revalidatePath("/pelanggan");
  redirect("/pelanggan?success=updated");
}

export async function archiveCustomerAction(id: string) {
  const parsedId = customerIdSchema.safeParse(id);
  let errorMessage: string | undefined;

  if (!parsedId.success) {
    errorMessage = "ID pelanggan tidak valid.";
  } else {
    try {
      await archiveCustomer(parsedId.data);
    } catch (error) {
      errorMessage = getSafeActionError(error);
    }
  }

  if (errorMessage) {
    redirect(`/pelanggan?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/pelanggan");
  redirect("/pelanggan?success=archived");
}
