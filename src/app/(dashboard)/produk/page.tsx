import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Eye, Pencil, Plus } from "lucide-react";

import { ArchiveProductButton } from "@/components/product/archive-product-button";
import { ProductDamageForm } from "@/components/product/product-damage-form";
import { PRODUCT_IMAGE_BLUR_DATA_URL } from "@/lib/product-image";
import { listProducts } from "@/server/services/products";

export const metadata: Metadata = { title: "Data Produk | Telur Jagoan" };

type ProductsPageProps = {
  searchParams: Promise<{ success?: string; product?: string; quantity?: string; error?: string }>;
};

const successMessages: Record<string, string> = {
  created: "Produk berhasil ditambahkan.",
  updated: "Produk berhasil diperbarui.",
  archived: "Produk berhasil dinonaktifkan.",
  damaged: "Kerusakan produk berhasil dicatat.",
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const [products, params] = await Promise.all([listProducts(), searchParams]);
  const successMessage = params.success ? successMessages[params.success] : undefined;

  return (
    <div className="mx-auto max-w-[1500px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Produk</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Data Produk</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola produk sederhana berbasis Kg. Stok berubah dari pembelian, retur, penjualan, dan kerusakan.
          </p>
        </div>
        <Link href="/produk/baru" className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus size={16} aria-hidden="true" /> Tambah produk
        </Link>
      </header>

      {successMessage && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
          {params.product ? ` ${params.product}` : ""}
          {params.quantity ? ` (${params.quantity} Kg)` : ""}
        </p>
      )}
      {params.error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p>}

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">Kategori</th>
                <th className="px-5 py-3 font-medium">Gambar</th>
                <th className="px-5 py-3 text-right font-medium">Harga/Kg</th>
                <th className="px-5 py-3 text-right font-medium">Stok Saat Ini</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const pricePerKg = product.units[0]?.sellingPrice;

                return (
                  <tr key={product.id} className="border-t align-top hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <p className="font-medium">{product.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{product.productCode}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{product.category?.name ?? "Tanpa kategori"}</td>
                    <td className="px-5 py-4">
                      <div className="relative size-12 overflow-hidden rounded-md bg-muted">
                        {product.imageUrl ? (
                          <Image src={product.imageUrl} alt={`Gambar ${product.name}`} fill sizes="48px" className="object-cover" placeholder="blur" blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL} />
                        ) : (
                          <span className="grid size-full place-items-center text-xs font-bold text-muted-foreground" aria-hidden="true">TJ</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-medium">
                      {pricePerKg ? currencyFormatter.format(Number(pricePerKg)) : "Belum ada"}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums">{product.currentStock.toString()} Kg</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${product.isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {product.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link href={`/produk/${product.id}`} title="Lihat detail produk" aria-label={`Lihat detail ${product.name}`} className="grid size-8 place-items-center rounded-md text-primary hover:bg-primary/10">
                          <Eye size={16} aria-hidden="true" />
                        </Link>
                        <Link href={`/produk/${product.id}/edit`} title="Edit produk" aria-label={`Edit ${product.name}`} className="grid size-8 place-items-center rounded-md text-primary hover:bg-primary/10">
                          <Pencil size={16} aria-hidden="true" />
                        </Link>
                        {product.isActive && <ProductDamageForm productId={product.id} productName={product.name} />}
                        {product.isActive && <ArchiveProductButton id={product.id} name={product.name} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">
                    Belum ada produk. Tambahkan produk pertama untuk memulai.
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
