"use client";

import { useActionState } from "react";

import { CurrencyInput } from "@/components/ui/currency-input";
import {
  closeCashSessionAction,
  type CashSessionActionState,
} from "@/server/actions/cash-sessions";

type CloseCashSessionFormProps = {
  expectedCash: string;
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function CloseCashSessionForm({ expectedCash }: CloseCashSessionFormProps) {
  const initialState: CashSessionActionState = {};
  const [state, formAction, pending] = useActionState(
    closeCashSessionAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
      {state.message && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <label className="block">
        <span className="mb-2 block text-sm font-medium">Kas fisik</span>
        <CurrencyInput
          name="actualCash"
          min="0"
          max="999999999999.99"
          defaultValue={expectedCash}
          required
          className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/25"
        />
        <FieldError errors={state.errors?.actualCash} />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium">Catatan penutupan</span>
        <textarea
          name="notes"
          rows={3}
          maxLength={5_000}
          placeholder="Opsional, wajib diisi secara operasional jika ada selisih"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
        />
        <FieldError errors={state.errors?.notes} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Menutup sesi..." : "Tutup sesi kasir"}
      </button>
    </form>
  );
}
