"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { CurrencyInput } from "@/components/ui/currency-input";
import {
  type PurchaseActionState,
  receivePurchaseAction,
} from "@/server/actions/purchases";

type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

type PurchaseReceiptFormProps = {
  purchase: {
    id: string;
    purchaseNumber: string;
    purchaseDate: string;
    dueDate: string | null;
    grandTotal: string;
    supplier: { supplierCode: string; name: string };
    items: Array<{
      id: string;
      quantity: string;
      unitCost: string;
      subtotal: string;
      product: { productCode: string; name: string };
      productUnit: { unitName: string };
    }>;
  };
  paymentMethods: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
  }>;
};

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/25";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function PurchaseReceiptForm({
  purchase,
  paymentMethods,
}: PurchaseReceiptFormProps) {
  const total = Number(purchase.grandTotal);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("UNPAID");
  const [amountPaid, setAmountPaid] = useState("0");
  const action = receivePurchaseAction.bind(null, purchase.id);
  const initialState: PurchaseActionState = {};
  const [state, formAction, pending] = useActionState(action, initialState);
  const remainingDebt = Math.max(0, total - Number(amountPaid || 0));

  function changeStatus(status: PaymentStatus) {
    setPaymentStatus(status);
    if (status === "UNPAID") setAmountPaid("0");
    if (status === "PAID") setAmountPaid(purchase.grandTotal);
    if (status === "PARTIAL" && Number(amountPaid) >= total) setAmountPaid("0");
  }

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Terima ${purchase.purchaseNumber} dengan status pembayaran ${paymentStatus}?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {state.message && (
        <p role="alert" aria-live="polite" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <section className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nomor pembelian</p>
          <p className="mt-2 font-semibold">{purchase.purchaseNumber}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Supplier</p>
          <p className="mt-2 font-semibold">{purchase.supplier.name}</p>
          <p className="text-xs text-muted-foreground">{purchase.supplier.supplierCode}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total pembelian</p>
          <p className="mt-2 text-lg font-bold text-primary">{currencyFormatter.format(total)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Ringkasan Item</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Produk</th>
                <th className="px-5 py-3 font-medium">Satuan</th>
                <th className="px-5 py-3 text-right font-medium">Jumlah</th>
                <th className="px-5 py-3 text-right font-medium">Harga beli</th>
                <th className="px-5 py-3 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-5 py-4">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.productCode}</p>
                  </td>
                  <td className="px-5 py-4">{item.productUnit.unitName}</td>
                  <td className="px-5 py-4 text-right">{item.quantity}</td>
                  <td className="px-5 py-4 text-right">{currencyFormatter.format(Number(item.unitCost))}</td>
                  <td className="px-5 py-4 text-right font-medium">{currencyFormatter.format(Number(item.subtotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Status pembayaran</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ["UNPAID", "Tempo", "Belum dibayar"],
                ["PARTIAL", "Sebagian", "Bayar sebagian"],
                ["PAID", "Lunas", "Bayar seluruhnya"],
              ] as const).map(([value, title, description]) => (
                <label key={value} className={`cursor-pointer rounded-lg border p-3 ${paymentStatus === value ? "border-primary bg-primary/5" : ""}`}>
                  <input
                    type="radio"
                    name="paymentStatus"
                    value={value}
                    checked={paymentStatus === value}
                    onChange={() => changeStatus(value)}
                    className="mr-2 accent-primary"
                  />
                  <span className="text-sm font-semibold">{title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
                </label>
              ))}
            </div>
            <FieldError errors={state.errors?.paymentStatus} />
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Jumlah dibayar</span>
              <CurrencyInput
                name="amountPaid"
                min="0"
                max={purchase.grandTotal}
                value={amountPaid}
                onValueChange={setAmountPaid}
                readOnly={paymentStatus !== "PARTIAL"}
                required
                className={inputClassName}
              />
              <FieldError errors={state.errors?.amountPaid} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Jatuh tempo</span>
              <input
                name="dueDate"
                type="date"
                min={purchase.purchaseDate}
                defaultValue={purchase.dueDate ?? ""}
                disabled={paymentStatus === "PAID"}
                className={inputClassName}
              />
              <FieldError errors={state.errors?.dueDate} />
            </label>
          </div>

          {paymentStatus !== "UNPAID" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Metode pembayaran</span>
                <select name="paymentMethodId" required defaultValue="" className={inputClassName}>
                  <option value="" disabled>Pilih metode</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.code} — {method.name}
                    </option>
                  ))}
                </select>
                <FieldError errors={state.errors?.paymentMethodId} />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Nomor referensi</span>
                <input name="referenceNumber" maxLength={100} className={inputClassName} placeholder="Opsional" />
                <FieldError errors={state.errors?.referenceNumber} />
              </label>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Catatan pembayaran</span>
            <textarea
              name="paymentNotes"
              maxLength={5_000}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25"
              placeholder="Opsional"
            />
            <FieldError errors={state.errors?.paymentNotes} />
          </label>
        </div>

        <dl className="h-fit space-y-3 rounded-lg bg-muted/50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-medium">{currencyFormatter.format(total)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Dibayar</dt>
            <dd>{currencyFormatter.format(Number(amountPaid || 0))}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t pt-3 text-base">
            <dt className="font-semibold">Sisa hutang</dt>
            <dd className="font-bold text-primary">{currencyFormatter.format(remainingDebt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-semibold">{paymentStatus}</dd>
          </div>
        </dl>
      </section>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Setelah dikonfirmasi, batch dan stok masuk dibuat bersama status pembayaran dalam satu transaksi database.
      </p>

      <div className="flex justify-end gap-3">
        <Link href="/pembelian" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Batal
        </Link>
        <button
          type="submit"
          disabled={pending || (paymentStatus !== "UNPAID" && !paymentMethods.length)}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Memproses..." : "Terima dan catat pembayaran"}
        </button>
      </div>
    </form>
  );
}
