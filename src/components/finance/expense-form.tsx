"use client";

import Link from "next/link";
import { useActionState } from "react";

import { CurrencyInput } from "@/components/ui/currency-input";
import {
  createExpenseAction,
  type FinanceActionState,
  updateExpenseAction,
} from "@/server/actions/finance";

type FinanceOption = { id: string; code?: string; name: string; type?: string };
type ExpenseValue = {
  id: string;
  expenseDate: Date;
  amount: { toString(): string };
  expenseCategoryId: string;
  paymentMethodId: string;
  description: string;
  receiptUrl: string | null;
};

type ExpenseFormProps = {
  categories: FinanceOption[];
  paymentMethods: FinanceOption[];
  expense?: ExpenseValue;
};

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function ExpenseForm({ categories, paymentMethods, expense }: ExpenseFormProps) {
  const action = expense ? updateExpenseAction.bind(null, expense.id) : createExpenseAction;
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
          <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={expense ? formatDateInput(expense.expenseDate) : formatDateInput(new Date())} name="date" type="date" />
          <FieldError errors={state.errors?.date} />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nominal</span>
          <CurrencyInput className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={expense?.amount.toString() ?? ""} min="1" name="amount" />
          <FieldError errors={state.errors?.amount} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Kategori pengeluaran</span>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={expense?.expenseCategoryId ?? ""} name="expenseCategoryId">
            <option value="">Pilih kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <FieldError errors={state.errors?.expenseCategoryId} />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Metode pembayaran</span>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={expense?.paymentMethodId ?? ""} name="paymentMethodId">
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
        <textarea className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue={expense?.description ?? ""} name="description" />
        <FieldError errors={state.errors?.description} />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium">URL bukti pengeluaran</span>
        <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={expense?.receiptUrl ?? ""} name="receiptUrl" placeholder="/uploads/..." />
        <FieldError errors={state.errors?.receiptUrl} />
      </label>

      <div className="flex justify-end gap-3">
        <Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted" href="/keuangan/pengeluaran">Batal</Link>
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" disabled={pending} type="submit">
          {pending ? "Menyimpan..." : expense ? "Simpan perubahan" : "Tambah pengeluaran"}
        </button>
      </div>
    </form>
  );
}
