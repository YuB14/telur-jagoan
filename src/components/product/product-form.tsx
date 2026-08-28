"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";

import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_BLUR_DATA_URL,
} from "@/lib/product-image";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  createProductAction,
  type ProductActionState,
  updateProductAction,
} from "@/server/actions/products";

type CategoryOption = {
  id: string;
  name: string;
  isActive: boolean;
};

type ProductFormValue = {
  id: string;
  productCode: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePerKg: string;
  isActive: boolean;
};

type ProductFormProps = {
  categories: CategoryOption[];
  product?: ProductFormValue;
};

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const action = product
    ? updateProductAction.bind(null, product.id)
    : createProductAction;
  const initialState: ProductActionState = {};
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <p role="alert" aria-live="polite" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <section className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Kode produk</span>
          <input name="productCode" defaultValue={product?.productCode} maxLength={30} required className={inputClassName} placeholder="Contoh: TLR-AYM" />
          <FieldError errors={state.errors?.productCode} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nama produk</span>
          <input name="name" defaultValue={product?.name} maxLength={150} required className={inputClassName} placeholder="Contoh: Telur Ayam" />
          <FieldError errors={state.errors?.name} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Kategori</span>
          <select name="categoryId" defaultValue={product?.categoryId ?? ""} className={inputClassName}>
            <option value="">Tanpa kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}{category.isActive ? "" : " (nonaktif)"}
              </option>
            ))}
          </select>
          <FieldError errors={state.errors?.categoryId} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Harga per kg</span>
          <CurrencyInput name="pricePerKg" min="1" defaultValue={product?.pricePerKg} required className={inputClassName} placeholder="Rp 28.000" />
          <FieldError errors={state.errors?.pricePerKg} />
        </label>

        <div className="block lg:col-span-2">
          <label htmlFor="product-image" className="mb-2 block text-sm font-medium">Gambar produk</label>
          {product?.imageUrl && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image src={product.imageUrl} alt={`Gambar ${product.name}`} fill sizes="80px" className="object-cover" placeholder="blur" blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL} />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input name="removeImage" type="checkbox" className="size-4 accent-primary" />
                Hapus gambar saat ini
              </label>
            </div>
          )}
          <input id="product-image" name="image" type="file" accept={PRODUCT_IMAGE_ACCEPT} className="block w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium" />
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, atau WebP; maksimal 5MB.</p>
          <FieldError errors={state.errors?.image} />
        </div>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium">Deskripsi</span>
          <textarea name="description" defaultValue={product?.description ?? ""} maxLength={5_000} rows={4} className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25" placeholder="Keterangan produk (opsional)" />
          <FieldError errors={state.errors?.description} />
        </label>

        <label className="flex items-center gap-2 text-sm lg:col-span-2">
          <input name="isActive" type="checkbox" defaultChecked={product?.isActive ?? true} className="size-4 accent-primary" />
          Produk aktif
        </label>
      </section>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Stok tidak diisi dari form produk. Produk baru selalu mulai dari 0 Kg dan bertambah dari transaksi pembelian. Satuan Kg dibuat otomatis di belakang layar.
      </p>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/produk" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Batal
        </Link>
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-65">
          {pending ? "Menyimpan..." : product ? "Simpan perubahan" : "Tambah produk"}
        </button>
      </div>
    </form>
  );
}
