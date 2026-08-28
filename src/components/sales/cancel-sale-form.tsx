"use client";

import { X } from "lucide-react";
import { useActionState, useState } from "react";

import { cancelSaleAction, type SaleActionState } from "@/server/actions/sales";

type CancelSaleFormProps = {
  saleId: string;
  saleNumber: string;
};

export function CancelSaleForm({ saleId, saleNumber }: CancelSaleFormProps) {
  const [reason, setReason] = useState("");
  const [state, formAction, pending] = useActionState(
    cancelSaleAction.bind(null, saleId),
    {} satisfies SaleActionState,
  );

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input
        name="reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        aria-label={`Alasan pembatalan ${saleNumber}`}
        placeholder="Alasan batal"
        required
        maxLength={1_000}
        className="h-8 w-32 rounded-md border bg-background px-2 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        title="Batalkan penjualan"
        aria-label={`Batalkan penjualan ${saleNumber}`}
        className="grid size-8 place-items-center rounded-md text-rose-600 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
      >
        <X size={16} aria-hidden="true" />
      </button>
      {state.message && <span className="sr-only" role="alert">{state.message}</span>}
    </form>
  );
}
