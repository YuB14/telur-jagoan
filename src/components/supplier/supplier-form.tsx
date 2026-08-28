"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createSupplierAction,
  type SupplierActionState,
  updateSupplierAction,
} from "@/server/actions/suppliers";

type SupplierFormValue = {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
};

type SupplierFormProps = {
  supplier?: SupplierFormValue;
};

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function SupplierForm({ supplier }: SupplierFormProps) {
  const action = supplier
    ? updateSupplierAction.bind(null, supplier.id)
    : createSupplierAction;
  const initialState: SupplierActionState = {};
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
          <p className="mb-2 text-sm font-medium">Kode supplier</p>
          <p className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-semibold">
            {supplier?.supplierCode ?? "Dibuat otomatis setelah data disimpan (SUP-0001)"}
          </p>
        </div>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium">Nama supplier</span>
          <input
            name="name"
            defaultValue={supplier?.name}
            maxLength={150}
            required
            className={inputClassName}
            placeholder="Contoh: CV Telur Makmur"
          />
          <FieldError errors={state.errors?.name} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nama kontak</span>
          <input
            name="contactPerson"
            defaultValue={supplier?.contactPerson ?? ""}
            maxLength={150}
            className={inputClassName}
            placeholder="Opsional"
          />
          <FieldError errors={state.errors?.contactPerson} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nomor telepon/WhatsApp</span>
          <input
            name="phone"
            type="tel"
            defaultValue={supplier?.phone ?? ""}
            maxLength={16}
            className={inputClassName}
            placeholder="081234567890 atau +6281234567890"
          />
          <p className="mt-1 text-xs text-muted-foreground">Diawali 08 atau +62; berisi 9–15 digit.</p>
          <FieldError errors={state.errors?.phone} />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={supplier?.email ?? ""}
            maxLength={150}
            className={inputClassName}
            placeholder="supplier@example.com (opsional)"
          />
          <FieldError errors={state.errors?.email} />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium">Alamat</span>
          <textarea
            name="address"
            defaultValue={supplier?.address ?? ""}
            maxLength={5_000}
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25"
            placeholder="Alamat supplier (opsional)"
          />
          <FieldError errors={state.errors?.address} />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium">Catatan</span>
          <textarea
            name="notes"
            defaultValue={supplier?.notes ?? ""}
            maxLength={5_000}
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25"
            placeholder="Informasi tambahan tentang supplier (opsional)"
          />
          <FieldError errors={state.errors?.notes} />
        </label>

        <label className="flex items-center gap-2 text-sm lg:col-span-2">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={supplier?.isActive ?? true}
            className="size-4 accent-primary"
          />
          Supplier aktif
        </label>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/supplier" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Batal
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-65"
        >
          {pending ? "Menyimpan..." : supplier ? "Simpan perubahan" : "Tambah supplier"}
        </button>
      </div>
    </form>
  );
}
