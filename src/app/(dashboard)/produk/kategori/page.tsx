import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { ArchiveProductCategoryButton } from "@/components/product/archive-product-category-button";
import { listProductCategories } from "@/server/services/product-categories";

export const metadata: Metadata = {
  title: "Kategori Produk | Telur Jagoan",
};

type ProductCategoriesPageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

const successMessages: Record<string, string> = {
  created: "Kategori berhasil ditambahkan.",
  updated: "Kategori berhasil diperbarui.",
  archived: "Kategori berhasil dinonaktifkan.",
};

export default async function ProductCategoriesPage({ searchParams }: ProductCategoriesPageProps) {
  const [categories, params] = await Promise.all([
    listProductCategories(),
    searchParams,
  ]);
  const successMessage = params.success ? successMessages[params.success] : undefined;

  return (
    <div className="mx-auto max-w-[1200px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Produk dan Stok</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kategori Produk</h1>
          <p className="mt-2 text-sm text-muted-foreground">Kelompokkan produk agar pencarian dan pengelolaan data lebih mudah.</p>
        </div>
        <Link href="/produk/kategori/baru" className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus size={16} aria-hidden="true" /> Tambah kategori
        </Link>
      </header>

      {successMessage && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</p>}
      {params.error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p>}

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Kode</th>
                <th className="px-5 py-3 font-medium">Kategori</th>
                <th className="px-5 py-3 text-right font-medium">Produk</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-t align-top hover:bg-muted/30">
                  <td className="px-5 py-4 font-medium">{category.categoryCode}</td>
                  <td className="max-w-xl px-5 py-4">
                    <p className="font-medium">{category.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{category.description ?? "Tanpa deskripsi"}</p>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">{category._count.products}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${category.isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {category.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/produk/kategori/${category.id}/edit`}
                        title="Edit kategori"
                        aria-label={`Edit kategori ${category.name}`}
                        className="grid size-8 place-items-center rounded-md text-amber-700 hover:bg-amber-50"
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </Link>
                      {category.isActive && <ArchiveProductCategoryButton id={category.id} name={category.name} />}
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">
                    Belum ada kategori produk.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
