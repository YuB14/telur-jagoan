import type { Metadata } from "next";

import { ProductUnitForm } from "@/components/product/product-unit-form";
import { listProductOptionsForUnits } from "@/server/services/product-units";

export const metadata: Metadata = {
  title: "Tambah Satuan Produk | Telur Jagoan",
};

export default async function NewProductUnitPage() {
  const products = await listProductOptionsForUnits();

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Satuan Produk</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tambah Satuan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tambahkan satuan dasar terlebih dahulu, lalu satuan turunannya.
        </p>
      </header>
      <ProductUnitForm products={products} />
    </div>
  );
}
