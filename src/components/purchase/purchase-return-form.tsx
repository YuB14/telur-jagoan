"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import {
  createPurchaseReturnAction,
  type PurchaseActionState,
} from "@/server/actions/purchases";

type ReturnableItem = {
  purchaseItemId: string;
  inventoryBatchId: string;
  label: string;
  batchNumber: string;
  maxQuantity: string;
  baseUnitName: string;
};

type PurchaseReturnFormProps = {
  purchaseId: string;
  purchaseNumber: string;
  items: ReturnableItem[];
};

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/25";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function PurchaseReturnForm({
  purchaseId,
  purchaseNumber,
  items,
}: PurchaseReturnFormProps) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const initialState: PurchaseActionState = {};
  const [state, formAction, pending] = useActionState(
    createPurchaseReturnAction.bind(null, purchaseId),
    initialState,
  );
  const serializedItems = useMemo(
    () =>
      JSON.stringify(
        items
          .map((item) => ({
            purchaseItemId: item.purchaseItemId,
            inventoryBatchId: item.inventoryBatchId,
            quantity: quantities[item.inventoryBatchId] ?? "",
          }))
          .filter((item) => item.quantity.trim() !== "" && Number(item.quantity) > 0),
      ),
    [items, quantities],
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="items" value={serializedItems} />

      {state.message && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Alasan retur</span>
          <select name="reason" defaultValue="DAMAGED" className={inputClassName}>
            <option value="DAMAGED">Rusak</option>
            <option value="WRONG_ITEM">Salah item</option>
            <option value="EXPIRED">Kedaluwarsa</option>
            <option value="OTHER">Lainnya</option>
          </select>
          <FieldError errors={state.errors?.reason} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Metode pengembalian</span>
          <select name="refundMethod" defaultValue="DEDUCT_FROM_DEBT" className={inputClassName}>
            <option value="DEDUCT_FROM_DEBT">Potong hutang supplier</option>
            <option value="CASH_REFUND">Supplier mengembalikan tunai</option>
            <option value="SUPPLIER_CREDIT">Kredit supplier</option>
          </select>
          <FieldError errors={state.errors?.refundMethod} />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-medium">Catatan</span>
          <input name="notes" maxLength={1_000} className={inputClassName} placeholder="Opsional" />
          <FieldError errors={state.errors?.notes} />
        </label>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 font-medium">Batch</th>
              <th className="px-5 py-3 text-right font-medium">Maks retur</th>
              <th className="px-5 py-3 font-medium">Jumlah retur</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.inventoryBatchId} className="border-t">
                <td className="px-5 py-4 font-medium">{item.label}</td>
                <td className="px-5 py-4">{item.batchNumber}</td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {item.maxQuantity} {item.baseUnitName}
                </td>
                <td className="px-5 py-4">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    max={item.maxQuantity}
                    value={quantities[item.inventoryBatchId] ?? ""}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.inventoryBatchId]: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    placeholder="0"
                  />
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center text-muted-foreground">
                  Tidak ada batch yang dapat diretur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <FieldError errors={state.errors?.items} />

      <div className="flex justify-end gap-3">
        <Link href="/pembelian" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Batal
        </Link>
        <button type="submit" disabled={pending || !items.length} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
          <RotateCcw size={16} aria-hidden="true" />
          {pending ? "Menyimpan..." : `Simpan retur ${purchaseNumber}`}
        </button>
      </div>
    </form>
  );
}
