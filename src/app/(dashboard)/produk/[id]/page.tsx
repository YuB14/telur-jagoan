import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PRODUCT_IMAGE_BLUR_DATA_URL } from "@/lib/product-image";
import { getProductDetail } from "@/server/services/products";
import { productIdSchema } from "@/server/validations/product";

export const metadata: Metadata = { title: "Detail Produk | Telur Jagoan" };

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function ProductDetailPage({ params }: PageProps<"/produk/[id]">) {
  const { id } = await params;
  const parsedId = productIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const product = await getProductDetail(parsedId.data);
  if (!product) notFound();

  const pricePerKg = product.units[0]?.sellingPrice;

  return (
    <div className="mx-auto max-w-[1200px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Produk</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{product.productCode} · {product.category?.name ?? "Tanpa kategori"}</p>
        </div>
        <Link href="/produk" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Kembali
        </Link>
      </header>

      <section className="grid gap-5 rounded-xl border bg-card p-5 sm:grid-cols-[120px_1fr]">
        <div className="relative size-28 overflow-hidden rounded-xl bg-muted">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={`Gambar ${product.name}`} fill sizes="112px" className="object-cover" placeholder="blur" blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL} />
          ) : (
            <span className="grid size-full place-items-center text-sm font-bold text-muted-foreground">TJ</span>
          )}
        </div>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Harga/Kg</dt>
            <dd className="mt-1 font-semibold">{pricePerKg ? currencyFormatter.format(Number(pricePerKg)) : "Belum ada"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Stok Saat Ini</dt>
            <dd className="mt-1 font-semibold">{product.currentStock.toString()} Kg</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-1 font-semibold">{product.isActive ? "Aktif" : "Nonaktif"}</dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-xs text-muted-foreground">Deskripsi</dt>
            <dd className="mt-1 text-sm">{product.description ?? "Tidak ada deskripsi."}</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Riwayat Batch</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Batch</th>
                <th className="px-5 py-3 font-medium">Tanggal Terima</th>
                <th className="px-5 py-3 text-right font-medium">Awal</th>
                <th className="px-5 py-3 text-right font-medium">Sisa</th>
                <th className="px-5 py-3 text-right font-medium">Modal/Kg</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {product.inventoryBatches.map((batch) => (
                <tr key={batch.id} className="border-t">
                  <td className="px-5 py-4 font-medium">{batch.batchNumber}</td>
                  <td className="px-5 py-4">{dateFormatter.format(batch.receivedDate)}</td>
                  <td className="px-5 py-4 text-right">{batch.initialQuantity.toString()}</td>
                  <td className="px-5 py-4 text-right">{batch.remainingQuantity.toString()}</td>
                  <td className="px-5 py-4 text-right">{currencyFormatter.format(Number(batch.baseUnitCost))}</td>
                  <td className="px-5 py-4">{batch.status}</td>
                </tr>
              ))}
              {!product.inventoryBatches.length && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Belum ada batch.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Pergerakan Stok Terakhir</h2></div>
        <div className="divide-y">
          {product.stockMovements.map((movement) => (
            <div key={movement.id} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[1fr_160px_160px]">
              <div>
                <p className="font-medium">{movement.movementNumber} · {movement.movementType}</p>
                <p className="mt-1 text-xs text-muted-foreground">{movement.description ?? "Tanpa keterangan"}</p>
              </div>
              <p className="text-muted-foreground">{dateFormatter.format(movement.createdAt)}</p>
              <p className="text-right tabular-nums">
                +{movement.quantityIn.toString()} / -{movement.quantityOut.toString()} Kg
              </p>
            </div>
          ))}
          {!product.stockMovements.length && (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">Belum ada pergerakan stok.</p>
          )}
        </div>
      </section>
    </div>
  );
}
