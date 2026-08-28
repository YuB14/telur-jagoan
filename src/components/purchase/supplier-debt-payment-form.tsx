"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { CurrencyInput } from "@/components/ui/currency-input";
import {
  type PurchaseActionState,
  paySupplierDebtAction,
} from "@/server/actions/purchases";

type SupplierDebtPaymentFormProps = {
  purchase: {
    id: string;
    purchaseNumber: string;
    purchaseDate: string;
    dueDate: string | null;
    grandTotal: string;
    amountPaid: string;
    remainingDebt: string;
    paymentStatus: string;
    supplier: { supplierCode: string; name: string };
    payments: Array<{
      id: string;
      paymentNumber: string;
      paymentDate: string;
      amount: string;
      paymentMethod: { name: string };
    }>;
  };
  paymentMethods: Array<{ id: string; code: string; name: string; type: string }>;
  defaultPaymentDate: string;
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

export function SupplierDebtPaymentForm({
  purchase,
  paymentMethods,
  defaultPaymentDate,
}: SupplierDebtPaymentFormProps) {
  const [amount, setAmount] = useState("");
  const action = paySupplierDebtAction.bind(null, purchase.id);
  const initialState: PurchaseActionState = {};
  const [state, formAction, pending] = useActionState(action, initialState);
  const remainingAfter = Math.max(0, Number(purchase.remainingDebt) - Number(amount || 0));

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Simpan pembayaran ${currencyFormatter.format(Number(amount || 0))} untuk ${purchase.purchaseNumber}?`,
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

      <section className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pembelian</p>
          <p className="mt-2 font-semibold">{purchase.purchaseNumber}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Supplier</p>
          <p className="mt-2 font-semibold">{purchase.supplier.name}</p>
          <p className="text-xs text-muted-foreground">{purchase.supplier.supplierCode}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total / Dibayar</p>
          <p className="mt-2 font-semibold">{currencyFormatter.format(Number(purchase.grandTotal))}</p>
          <p className="text-xs text-muted-foreground">{currencyFormatter.format(Number(purchase.amountPaid))}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Sisa hutang</p>
          <p className="mt-2 text-lg font-bold text-rose-600">{currencyFormatter.format(Number(purchase.remainingDebt))}</p>
          <p className="text-xs text-muted-foreground">{purchase.paymentStatus}</p>
        </div>
      </section>

      <section className="grid gap-6 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Tanggal pembayaran</span>
            <input
              name="paymentDate"
              type="date"
              min={purchase.purchaseDate}
              defaultValue={defaultPaymentDate}
              required
              className={inputClassName}
            />
            <FieldError errors={state.errors?.paymentDate} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Jumlah pembayaran</span>
            <CurrencyInput
              name="amount"
              min="1"
              max={purchase.remainingDebt}
              value={amount}
              onValueChange={setAmount}
              required
              className={inputClassName}
              placeholder="Rp 0"
            />
            <FieldError errors={state.errors?.amount} />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium">Metode pembayaran</span>
            <select name="paymentMethodId" required defaultValue="" className={inputClassName}>
              <option value="" disabled>Pilih metode pembayaran</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.code} — {method.name}
                </option>
              ))}
            </select>
            <FieldError errors={state.errors?.paymentMethodId} />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium">Nomor referensi</span>
            <input name="referenceNumber" maxLength={100} className={inputClassName} placeholder="Opsional" />
            <FieldError errors={state.errors?.referenceNumber} />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium">Bukti pembayaran</span>
            <input name="receiptFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="block w-full text-sm" />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium">Catatan</span>
            <textarea name="notes" maxLength={5_000} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25" placeholder="Opsional" />
            <FieldError errors={state.errors?.notes} />
          </label>
        </div>

        <dl className="h-fit space-y-3 rounded-lg bg-muted/50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Sisa saat ini</dt>
            <dd className="font-medium">{currencyFormatter.format(Number(purchase.remainingDebt))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Pembayaran</dt>
            <dd>-{currencyFormatter.format(Number(amount || 0))}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t pt-3 text-base">
            <dt className="font-semibold">Sisa setelah bayar</dt>
            <dd className="font-bold text-primary">{currencyFormatter.format(remainingAfter)}</dd>
          </div>
          <p className="pt-2 text-xs leading-5 text-muted-foreground">
            Server membaca ulang sisa hutang terbaru sebelum menyimpan pembayaran.
          </p>
        </dl>
      </section>

      {purchase.payments.length > 0 && (
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-5 py-4"><h2 className="font-semibold">Riwayat Pembayaran</h2></div>
          <div className="divide-y">
            {purchase.payments.map((payment) => (
              <div key={payment.id} className="flex flex-wrap justify-between gap-3 px-5 py-4 text-sm">
                <div>
                  <p className="font-medium">{payment.paymentNumber}</p>
                  <p className="text-xs text-muted-foreground">{payment.paymentDate} · {payment.paymentMethod.name}</p>
                </div>
                <p className="font-semibold">{currencyFormatter.format(Number(payment.amount))}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-end gap-3">
        <Link href="/pembelian/hutang" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">Batal</Link>
        <button type="submit" disabled={pending || !paymentMethods.length} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
          {pending ? "Menyimpan..." : "Simpan pembayaran"}
        </button>
      </div>
    </form>
  );
}
