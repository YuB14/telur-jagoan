"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createProductCategoryAction,
  type ProductCategoryActionState,
  updateProductCategoryAction,
} from "@/server/actions/product-categories";

type ProductCategoryFormValue = {
  id: string;
  categoryCode: string;
  name: string;
};

type ProductCategoryFormProps = {
  category?: ProductCategoryFormValue;
};

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function ProductCategoryForm({ category }: ProductCategoryFormProps) {
  const action = category
    ? updateProductCategoryAction.bind(null, category.id)
    : createProductCategoryAction;
  const initialState: ProductCategoryActionState = {};
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
          <span className="mb-2 block text-sm font-medium">Kode kategori</span>
          <input
            name="categoryCode"
            defaultValue={category?.categoryCode}
            maxLength={30}
            required
            className={inputClassName}
            placeholder="Contoh: TLR-AYAM"
          />
          <FieldError errors={state.errors?.categoryCode} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nama kategori</span>
          <input
            name="name"
            defaultValue={category?.name}
            maxLength={150}
            required
            className={inputClassName}
            placeholder="Contoh: Telur Ayam"
          />
          <FieldError errors={state.errors?.name} />
        </label>

      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/produk/kategori" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Batal
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-65"
        >
          {pending ? "Menyimpan..." : category ? "Simpan perubahan" : "Tambah kategori"}
        </button>
      </div>
    </form>
  );
}
