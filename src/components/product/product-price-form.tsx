"use client";

import Link from "next/link";
import { useActionState } from "react";

import { CurrencyInput } from "@/components/ui/currency-input";
import {
  type ProductPriceActionState,
  updateProductPriceAction,
} from "@/server/actions/product-prices";

type ProductPriceFormProps = {
  unit: {
    id: string;
    unitName: string;
    conversionToBase: string;
    sellingPrice: string;
    wholesalePrice: string | null;
    isBaseUnit: boolean;
    isActive: boolean;
    isKilogramPrice: boolean;
    product: {
      productCode: string;
      name: string;
      baseUnitName: string;
      isActive: boolean;
    };
  };
};

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function ProductPriceForm({ unit }: ProductPriceFormProps) {
  const action = updateProductPriceAction.bind(null, unit.id);
  const initialState: ProductPriceActionState = {};
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <p role="alert" aria-live="polite" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
        <div className="grid gap-4 rounded-lg bg-muted/50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Produk</p>
            <p className="mt-1 font-semibold">{unit.product.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{unit.product.productCode}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Satuan</p>
            <p className="mt-1 font-semibold">
              {unit.unitName}{unit.isBaseUnit ? " (satuan dasar)" : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              1 {unit.unitName} = {unit.conversionToBase} {unit.product.baseUnitName}
            </p>
          </div>
        </div>

        {unit.isKilogramPrice && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
            Harga per kilogram bersifat statis. Kasir hanya memasukkan jumlah kilogram hasil timbangan fisik; sistem menggunakan harga yang disimpan di sini tanpa perhitungan harga real-time.
          </p>
        )}

        {(!unit.isActive || !unit.product.isActive) && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Produk atau satuan ini sedang nonaktif. Perubahan harga tetap dapat disimpan untuk persiapan saat diaktifkan kembali.
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              {unit.isKilogramPrice ? "Harga jual per kg" : `Harga jual per ${unit.unitName.toLowerCase()}`}
            </span>
            <CurrencyInput name="sellingPrice" defaultValue={unit.sellingPrice} min="1" max="999999999999" required className={inputClassName} />
            <p className="mt-1 text-xs text-muted-foreground">Wajib lebih besar dari 0.</p>
            <FieldError errors={state.errors?.sellingPrice} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Harga grosir</span>
            <CurrencyInput name="wholesalePrice" defaultValue={unit.wholesalePrice ?? ""} min="1" max="999999999999" className={inputClassName} placeholder="Opsional" />
            <p className="mt-1 text-xs text-muted-foreground">Opsional; jika diisi wajib lebih besar dari 0.</p>
            <FieldError errors={state.errors?.wholesalePrice} />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/produk/harga" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Batal
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-65"
        >
          {pending ? "Menyimpan..." : "Simpan harga"}
        </button>
      </div>
    </form>
  );
}
