import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductUnitForm } from "@/components/product/product-unit-form";
import {
  getProductUnitForEdit,
  listProductOptionsForUnits,
} from "@/server/services/product-units";
import { productUnitIdSchema } from "@/server/validations/product-unit";

export const metadata: Metadata = {
  title: "Edit Satuan Produk | Telur Jagoan",
};

export default async function EditProductUnitPage({
  params,
}: PageProps<"/produk/satuan/[id]/edit">) {
  const { id } = await params;
  const parsedId = productUnitIdSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const [unit, products] = await Promise.all([
    getProductUnitForEdit(parsedId.data),
    listProductOptionsForUnits(),
  ]);

  if (!unit) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Satuan Produk</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit Satuan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Perbarui nama, faktor konversi, barcode, dan status satuan.
        </p>
      </header>
      <ProductUnitForm
        products={products}
        unit={{
          ...unit,
          conversionToBase: unit.conversionToBase.toString(),
          sellingPrice: unit.sellingPrice.toString(),
          wholesalePrice: unit.wholesalePrice?.toString() ?? null,
        }}
      />
    </div>
  );
}
