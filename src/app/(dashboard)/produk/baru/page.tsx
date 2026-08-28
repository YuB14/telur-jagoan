import type { Metadata } from "next";

import { ProductForm } from "@/components/product/product-form";
import { listProductCategoryOptions } from "@/server/services/products";

export const metadata: Metadata = {
  title: "Tambah Produk | Telur Jagoan",
};

export default async function NewProductPage() {
  const categories = await listProductCategoryOptions();

  return (
    <div className="mx-auto max-w-4xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Data Produk</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tambah Produk</h1>
        <p className="mt-2 text-sm text-muted-foreground">Isi data produk dan harga per kg. Stok awal selalu 0 Kg dan bertambah dari pembelian.</p>
      </header>
      <ProductForm categories={categories} />
    </div>
  );
}
