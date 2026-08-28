"use client";

import { useActionState } from "react";

import { CurrencyInput } from "@/components/ui/currency-input";
import {
  openCashSessionAction,
  type CashSessionActionState,
} from "@/server/actions/cash-sessions";

type OpenCashSessionFormProps = {
  registers: Array<{ id: string; code: string; name: string; location: string | null }>;
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function OpenCashSessionForm({ registers }: OpenCashSessionFormProps) {
  const initialState: CashSessionActionState = {};
  const [state, formAction, pending] = useActionState(
    openCashSessionAction,
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
        <span className="mb-2 block text-sm font-medium">Perangkat kasir</span>
        <select
          name="cashRegisterId"
          required
          defaultValue={registers.length === 1 ? registers[0].id : ""}
          className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/25"
        >
          <option value="" disabled>Pilih perangkat kasir</option>
          {registers.map((register) => (
            <option key={register.id} value={register.id}>
              {register.code} — {register.name}{register.location ? ` (${register.location})` : ""}
            </option>
          ))}
        </select>
        <FieldError errors={state.errors?.cashRegisterId} />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium">Modal awal</span>
        <CurrencyInput
          name="openingCash"
          min="0"
          max="999999999999.99"
          defaultValue="0"
          required
          className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/25"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Modal awal dicatat sebagai posisi kas, bukan pemasukan penjualan.
        </p>
        <FieldError errors={state.errors?.openingCash} />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium">Catatan</span>
        <textarea
          name="notes"
          rows={3}
          maxLength={5_000}
          placeholder="Opsional"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
        />
        <FieldError errors={state.errors?.notes} />
      </label>

      <button
        type="submit"
        disabled={pending || !registers.length}
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Membuka sesi..." : "Buka sesi kasir"}
      </button>
    </form>
  );
}
