"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";

import {
  type ProductActionState,
  recordProductDamageAction,
} from "@/server/actions/products";

type ProductDamageFormProps = {
  productId: string;
  productName: string;
};

const inputClassName = "h-8 rounded-md border bg-background px-2 text-xs";

export function ProductDamageForm({ productId, productName }: ProductDamageFormProps) {
  const [open, setOpen] = useState(false);
  const initialState: ProductActionState = {};
  const [state, formAction, pending] = useActionState(
    recordProductDamageAction.bind(null, productId),
    initialState,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Catat kerusakan"
        aria-label={`Catat kerusakan ${productName}`}
        className="grid size-8 place-items-center rounded-md text-amber-700 hover:bg-amber-50"
      >
        <TriangleAlert size={16} aria-hidden="true" />
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center justify-end gap-2">
      <input name="quantity" type="number" min="1" step="1" required placeholder="Kg rusak" className={`${inputClassName} w-24`} />
      <select name="damageType" defaultValue="BROKEN" className={inputClassName}>
        <option value="BROKEN">Pecah</option>
        <option value="ROTTEN">Busuk</option>
        <option value="EXPIRED">Kedaluwarsa</option>
        <option value="LOST">Hilang</option>
        <option value="OTHER">Lainnya</option>
      </select>
      <input name="notes" maxLength={1_000} placeholder="Catatan" className={`${inputClassName} w-28`} />
      <button type="submit" disabled={pending} className="h-8 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground disabled:opacity-60">
        Simpan
      </button>
      <button type="button" onClick={() => setOpen(false)} className="h-8 rounded-md border px-2 text-xs hover:bg-muted">
        Batal
      </button>
      {state.message && <span className="sr-only" role="alert">{state.message}</span>}
    </form>
  );
}
