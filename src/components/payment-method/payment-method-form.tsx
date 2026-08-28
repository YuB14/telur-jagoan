"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createPaymentMethodAction,
  type PaymentMethodActionState,
  updatePaymentMethodAction,
} from "@/server/actions/payment-methods";

type PaymentMethodFormValue = {
  id: string;
  code: string;
  name: string;
  type: "CASH" | "QRIS" | "TRANSFER" | "DEBIT_CARD" | "OTHER";
  isActive: boolean;
};

type PaymentMethodFormProps = {
  paymentMethod?: PaymentMethodFormValue;
};

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function PaymentMethodForm({ paymentMethod }: PaymentMethodFormProps) {
  const action = paymentMethod
    ? updatePaymentMethodAction.bind(null, paymentMethod.id)
    : createPaymentMethodAction;
  const initialState: PaymentMethodActionState = {};
  const [state, formAction, pending] = useActionState(
    action,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <p role="alert" aria-live="polite" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <section className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Kode metode</span>
          <input
            name="code"
            defaultValue={paymentMethod?.code}
            maxLength={30}
            required
            className={inputClassName}
            placeholder="Contoh: EDC-BCA"
          />
          <p className="mt-1 text-xs text-muted-foreground">Disimpan otomatis dalam huruf besar.</p>
          <FieldError errors={state.errors?.code} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nama metode</span>
          <input
            name="name"
            defaultValue={paymentMethod?.name}
            maxLength={100}
            required
            className={inputClassName}
            placeholder="Contoh: Kartu Debit BCA"
          />
          <FieldError errors={state.errors?.name} />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium">Jenis pembayaran</span>
          <select
            name="type"
            defaultValue={paymentMethod?.type ?? "OTHER"}
            required
            className={inputClassName}
          >
            <option value="CASH">Tunai</option>
            <option value="QRIS">QRIS</option>
            <option value="TRANSFER">Transfer</option>
            <option value="DEBIT_CARD">Kartu Debit</option>
            <option value="OTHER">Lainnya</option>
          </select>
          <FieldError errors={state.errors?.type} />
        </label>

        <label className="flex items-center gap-2 text-sm lg:col-span-2">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={paymentMethod?.isActive ?? true}
            className="size-4 accent-primary"
          />
          Metode pembayaran aktif
        </label>

        <p className="rounded-lg bg-muted/60 px-4 py-3 text-xs leading-5 text-muted-foreground lg:col-span-2">
          Metode nonaktif tidak ditawarkan pada transaksi baru, tetapi tetap dipertahankan untuk riwayat pembayaran sebelumnya.
        </p>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/pengaturan/metode-pembayaran" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Batal
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-65"
        >
          {pending ? "Menyimpan..." : paymentMethod ? "Simpan perubahan" : "Tambah metode"}
        </button>
      </div>
    </form>
  );
}
