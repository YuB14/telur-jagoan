import type { Metadata } from "next";

import { ProductCategoryForm } from "@/components/product/product-category-form";

export const metadata: Metadata = {
  title: "Tambah Kategori Produk | Telur Jagoan",
};

export default function NewProductCategoryPage() {
  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Kategori Produk</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tambah Kategori</h1>
        <p className="mt-2 text-sm text-muted-foreground">Buat kelompok baru untuk mengorganisasi data produk.</p>
      </header>
      <ProductCategoryForm />
    </div>
  );
}
