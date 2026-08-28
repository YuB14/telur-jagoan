import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/product/product-form";
import { getProductForEdit, listProductCategoryOptions } from "@/server/services/products";
import { productIdSchema } from "@/server/validations/product";

export const metadata: Metadata = {
  title: "Edit Produk | Telur Jagoan",
};

export default async function EditProductPage({ params }: PageProps<"/produk/[id]/edit">) {
  const { id } = await params;
  const parsedId = productIdSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const [product, categories] = await Promise.all([
    getProductForEdit(parsedId.data),
    listProductCategoryOptions(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Data Produk</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit Produk</h1>
        <p className="mt-2 text-sm text-muted-foreground">Perbarui data master tanpa mengubah stok berjalan.</p>
      </header>
      <ProductForm
        categories={categories}
        product={{
          id: product.id,
          productCode: product.productCode,
          categoryId: product.categoryId,
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          pricePerKg: product.units[0]?.sellingPrice.toString() ?? "",
          isActive: product.isActive,
        }}
      />
    </div>
  );
}
