"use client";

import Link from "next/link";
import { useActionState } from "react";

import { CurrencyInput } from "@/components/ui/currency-input";
import {
  createIncomeAction,
  type FinanceActionState,
  updateIncomeAction,
} from "@/server/actions/finance";

type FinanceOption = { id: string; name: string; type?: string };
type IncomeValue = {
  id: string;
  incomeDate: Date;
  incomeType: string;
  amount: { toString(): string };
  paymentMethodId: string;
  description: string;
};

type IncomeFormProps = {
  paymentMethods: FinanceOption[];
  income?: IncomeValue;
};

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function IncomeForm({ paymentMethods, income }: IncomeFormProps) {
  const action = income ? updateIncomeAction.bind(null, income.id) : createIncomeAction;
  const [state, formAction, pending] = useActionState(action, {} satisfies FinanceActionState);

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-card p-6">
      {state.message && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Tanggal</span>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={income ? formatDateInput(income.incomeDate) : formatDateInput(new Date())} name="date" type="date" />
          <FieldError errors={state.errors?.date} />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nominal</span>
          <CurrencyInput className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={income?.amount.toString() ?? ""} min="1" name="amount" />
          <FieldError errors={state.errors?.amount} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Jenis pemasukan</span>
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={income?.incomeType ?? ""} name="incomeType" placeholder="Contoh: Penambahan modal owner" />
          <FieldError errors={state.errors?.incomeType} />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Metode pembayaran</span>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={income?.paymentMethodId ?? ""} name="paymentMethodId">
            <option value="">Pilih metode</option>
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>{method.name}</option>
            ))}
          </select>
          <FieldError errors={state.errors?.paymentMethodId} />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium">Keterangan</span>
        <textarea className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={income?.description ?? ""} name="description" />
        <FieldError errors={state.errors?.description} />
      </label>

      <div className="flex justify-end gap-3">
        <Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted" href="/keuangan/pemasukan">Batal</Link>
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" disabled={pending} type="submit">
          {pending ? "Menyimpan..." : income ? "Simpan perubahan" : "Tambah pemasukan"}
        </button>
      </div>
    </form>
  );
}
