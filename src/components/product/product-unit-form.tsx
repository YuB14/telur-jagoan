"use client";

import Link from "next/link";
import { useActionState } from "react";

import { CurrencyInput } from "@/components/ui/currency-input";
import {
  createProductUnitAction,
  type ProductUnitActionState,
  updateProductUnitAction,
} from "@/server/actions/product-units";

type ProductOption = {
  id: string;
  productCode: string;
  name: string;
  baseUnitName: string;
  isActive: boolean;
};

type ProductUnitFormValue = {
  id: string;
  productId: string;
  unitName: string;
  conversionToBase: string;
  sellingPrice: string;
  wholesalePrice: string | null;
  barcode: string | null;
  isBaseUnit: boolean;
  isActive: boolean;
};

type ProductUnitFormProps = {
  products: ProductOption[];
  unit?: ProductUnitFormValue;
};

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:bg-muted";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function ProductUnitForm({ products, unit }: ProductUnitFormProps) {
  const action = unit
    ? updateProductUnitAction.bind(null, unit.id)
    : createProductUnitAction;
  const initialState: ProductUnitActionState = {};
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <p role="alert" aria-live="polite" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <section className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-2">
        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium">Produk</span>
          {unit && <input type="hidden" name="productId" value={unit.productId} />}
          <select
            name={unit ? undefined : "productId"}
            defaultValue={unit?.productId ?? ""}
            disabled={Boolean(unit)}
            required
            className={inputClassName}
          >
            <option value="" disabled>Pilih produk</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.productCode} — {product.name} ({product.baseUnitName})
                {product.isActive ? "" : " — nonaktif"}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Produk tidak dapat dipindahkan setelah satuan dibuat.
          </p>
          <FieldError errors={state.errors?.productId} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nama satuan</span>
          <input
            name="unitName"
            defaultValue={unit?.unitName}
            maxLength={30}
            required
            className={inputClassName}
            placeholder="Contoh: BUTIR atau TRAY"
          />
          <FieldError errors={state.errors?.unitName} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Konversi ke satuan dasar</span>
          <input
            name="conversionToBase"
            type="number"
            defaultValue={unit?.conversionToBase ?? "1"}
            min="0.0001"
            max="9999999999.9999"
            step="0.0001"
            required
            className={inputClassName}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Wajib lebih dari 0. Satuan dasar harus bernilai 1.
          </p>
          <FieldError errors={state.errors?.conversionToBase} />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium">Barcode satuan</span>
          <input
            name="barcode"
            defaultValue={unit?.barcode ?? ""}
            maxLength={100}
            className={inputClassName}
            placeholder="Opsional"
          />
          <FieldError errors={state.errors?.barcode} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Harga jual</span>
          <CurrencyInput
            name="sellingPrice"
            defaultValue={unit?.sellingPrice}
            min="1"
            max="999999999999"
            required
            className={inputClassName}
            placeholder="Rp 28.000"
          />
          <FieldError errors={state.errors?.sellingPrice} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Harga grosir</span>
          <CurrencyInput
            name="wholesalePrice"
            defaultValue={unit?.wholesalePrice ?? ""}
            min="1"
            max="999999999999"
            className={inputClassName}
            placeholder="Opsional"
          />
          <FieldError errors={state.errors?.wholesalePrice} />
        </label>

        <div className="flex flex-wrap gap-6 lg:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              name="isBaseUnit"
              type="checkbox"
              defaultChecked={unit?.isBaseUnit ?? false}
              className="size-4 accent-primary"
            />
            Satuan dasar
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={unit?.isActive ?? true}
              className="size-4 accent-primary"
            />
            Satuan aktif
          </label>
        </div>

        <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 lg:col-span-2">
          Setiap produk wajib memiliki satu satuan dasar aktif. Nama satuan dasar harus sama dengan satuan dasar pada data produk, dan konversinya selalu 1.
        </p>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/produk/satuan" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Batal
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-65"
        >
          {pending ? "Menyimpan..." : unit ? "Simpan perubahan" : "Tambah satuan"}
        </button>
      </div>
    </form>
  );
}
