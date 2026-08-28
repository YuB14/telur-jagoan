"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createCustomerAction,
  type CustomerActionState,
  updateCustomerAction,
} from "@/server/actions/customers";

type CustomerFormValue = {
  id: string;
  customerCode: string;
  name: string;
  phone: string | null;
  address: string | null;
  customerType: "GENERAL" | "RETAIL" | "WHOLESALE";
  isActive: boolean;
};

type CustomerFormProps = {
  customer?: CustomerFormValue;
};

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const action = customer
    ? updateCustomerAction.bind(null, customer.id)
    : createCustomerAction;
  const initialState: CustomerActionState = {};
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <p role="alert" aria-live="polite" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <section className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <p className="mb-2 text-sm font-medium">Kode pelanggan</p>
          <p className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-semibold">
            {customer?.customerCode ?? "Dibuat otomatis setelah data disimpan (CUS-0001)"}
          </p>
        </div>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium">Nama pelanggan</span>
          <input
            name="name"
            defaultValue={customer?.name}
            maxLength={150}
            required
            className={inputClassName}
            placeholder="Contoh: Warung Bu Sari"
          />
          <FieldError errors={state.errors?.name} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Jenis pelanggan</span>
          <select
            name="customerType"
            defaultValue={customer?.customerType ?? "RETAIL"}
            required
            className={inputClassName}
          >
            <option value="GENERAL">Umum</option>
            <option value="RETAIL">Eceran</option>
            <option value="WHOLESALE">Grosir</option>
          </select>
          <FieldError errors={state.errors?.customerType} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nomor telepon/WhatsApp</span>
          <input
            name="phone"
            type="tel"
            defaultValue={customer?.phone ?? ""}
            maxLength={16}
            className={inputClassName}
            placeholder="081234567890 atau +6281234567890"
          />
          <p className="mt-1 text-xs text-muted-foreground">Diawali 08 atau +62; berisi 9–15 digit.</p>
          <FieldError errors={state.errors?.phone} />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium">Alamat</span>
          <textarea
            name="address"
            defaultValue={customer?.address ?? ""}
            maxLength={5_000}
            rows={5}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25"
            placeholder="Alamat pelanggan (opsional)"
          />
          <FieldError errors={state.errors?.address} />
        </label>

        <label className="flex items-center gap-2 text-sm lg:col-span-2">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={customer?.isActive ?? true}
            className="size-4 accent-primary"
          />
          Pelanggan aktif
        </label>

        <p className="rounded-lg bg-muted/60 px-4 py-3 text-xs leading-5 text-muted-foreground lg:col-span-2">
          Data pelanggan hanya menyimpan identitas dan jenis pelanggan. Sistem tidak menyediakan kredit, hutang, cicilan, atau jatuh tempo pelanggan.
        </p>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/pelanggan" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Batal
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-65"
        >
          {pending ? "Menyimpan..." : customer ? "Simpan perubahan" : "Tambah pelanggan"}
        </button>
      </div>
    </form>
  );
}
