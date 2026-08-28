import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductCategoryForm } from "@/components/product/product-category-form";
import { getProductCategoryForEdit } from "@/server/services/product-categories";
import { productCategoryIdSchema } from "@/server/validations/product-category";

export const metadata: Metadata = {
  title: "Edit Kategori Produk | Telur Jagoan",
};

export default async function EditProductCategoryPage({
  params,
}: PageProps<"/produk/kategori/[id]/edit">) {
  const { id } = await params;
  const parsedId = productCategoryIdSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const category = await getProductCategoryForEdit(parsedId.data);

  if (!category) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Kategori Produk</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit Kategori</h1>
        <p className="mt-2 text-sm text-muted-foreground">Perbarui identitas dan status kategori produk.</p>
      </header>
      <ProductCategoryForm category={category} />
    </div>
  );
}
