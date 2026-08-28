"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { createSaleReturnAction, type SaleActionState } from "@/server/actions/sales";

type ReturnableItem = {
  id: string;
  productNameSnapshot: string;
  unitNameSnapshot: string;
  baseUnitName: string;
  returnableQuantity: string;
};

type SaleReturnFormProps = {
  saleId: string;
  saleNumber: string;
  items: ReturnableItem[];
};

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/25";

export function SaleReturnForm({ saleId, saleNumber, items }: SaleReturnFormProps) {
  const [reason, setReason] = useState("DAMAGED");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState(
    createSaleReturnAction.bind(null, saleId),
    {} satisfies SaleActionState,
  );

  const serializedItems = useMemo(
    () =>
      JSON.stringify(
        items
          .map((item) => ({
            saleItemId: item.id,
            quantity: quantities[item.id] ?? "",
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
          <select
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={inputClassName}
          >
            <option value="DAMAGED">Barang rusak</option>
            <option value="WRONG_ITEM">Salah item</option>
            <option value="CUSTOMER_CHANGED_MIND">Pelanggan berubah pikiran</option>
            <option value="OTHER">Lainnya</option>
          </select>
          {state.errors?.reason?.[0] && <p className="mt-1 text-xs text-rose-600">{state.errors.reason[0]}</p>}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Catatan</span>
          <input
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={1_000}
            className={inputClassName}
            placeholder="Opsional"
          />
          {state.errors?.notes?.[0] && <p className="mt-1 text-xs text-rose-600">{state.errors.notes[0]}</p>}
        </label>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 text-right font-medium">Maks retur</th>
              <th className="px-5 py-3 font-medium">Jumlah retur</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-5 py-4">
                  <p className="font-medium">{item.productNameSnapshot}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.unitNameSnapshot}</p>
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {item.returnableQuantity} {item.baseUnitName}
                </td>
                <td className="px-5 py-4">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    max={item.returnableQuantity}
                    value={quantities[item.id] ?? ""}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.id]: event.target.value,
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
                <td colSpan={3} className="px-5 py-16 text-center text-muted-foreground">
                  Tidak ada item yang dapat diretur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {state.errors?.items?.[0] && <p className="text-sm text-rose-600">{state.errors.items[0]}</p>}

      <div className="flex justify-end gap-3">
        <Link
          href="/penjualan"
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={pending || !items.length}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          <RotateCcw size={16} aria-hidden="true" />
          {pending ? "Menyimpan..." : `Simpan retur ${saleNumber}`}
        </button>
      </div>
    </form>
  );
}
