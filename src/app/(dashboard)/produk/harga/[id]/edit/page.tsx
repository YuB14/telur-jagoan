import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductPriceForm } from "@/components/product/product-price-form";
import { getProductPriceForEdit } from "@/server/services/product-prices";
import { productPriceUnitIdSchema } from "@/server/validations/product-price";

export const metadata: Metadata = {
  title: "Edit Harga Produk | Telur Jagoan",
};

export default async function EditProductPricePage({
  params,
}: PageProps<"/produk/harga/[id]/edit">) {
  const { id } = await params;
  const parsedId = productPriceUnitIdSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const unit = await getProductPriceForEdit(parsedId.data);

  if (!unit) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Harga Produk</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {unit.isKilogramPrice ? "Atur Harga per Kilogram" : "Edit Harga Satuan"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Perbarui harga jual dan harga grosir tanpa mengubah identitas satuan.
        </p>
      </header>
      <ProductPriceForm
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
