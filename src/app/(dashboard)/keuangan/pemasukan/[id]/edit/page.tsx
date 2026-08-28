import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IncomeForm } from "@/components/finance/income-form";
import { getIncomeDetail, listFinanceOptions } from "@/server/services/finance";
import { financeEntryIdSchema } from "@/server/validations/finance";

export const metadata: Metadata = { title: "Edit Pemasukan | Telur Jagoan" };

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = financeEntryIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const [income, { paymentMethods }] = await Promise.all([
    getIncomeDetail(parsedId.data),
    listFinanceOptions(),
  ]);
  if (!income) notFound();

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Pemasukan</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit Pemasukan</h1>
      </header>
      <IncomeForm income={income} paymentMethods={paymentMethods} />
    </div>
  );
}
