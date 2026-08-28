import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CashierForm } from "@/components/settings/cashier-form";
import { getCashierForEdit } from "@/server/services/settings";
import { cashierIdSchema } from "@/server/validations/settings";

export const metadata: Metadata = { title: "Edit Kasir | Telur Jagoan" };

export default async function EditCashierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = cashierIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const cashier = await getCashierForEdit(parsedId.data);
  if (!cashier) notFound();

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Pengguna</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit Kasir</h1>
      </header>
      <CashierForm cashier={cashier} />
    </div>
  );
}
