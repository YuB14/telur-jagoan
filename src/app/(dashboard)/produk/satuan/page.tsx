import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { ArchiveProductUnitButton } from "@/components/product/archive-product-unit-button";
import { listProductUnits } from "@/server/services/product-units";

export const metadata: Metadata = {
  title: "Satuan Produk | Telur Jagoan",
};

type ProductUnitsPageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

const successMessages: Record<string, string> = {
  created: "Satuan produk berhasil ditambahkan.",
  updated: "Satuan produk berhasil diperbarui.",
  archived: "Satuan produk berhasil dinonaktifkan.",
};

export default async function ProductUnitsPage({ searchParams }: ProductUnitsPageProps) {
  const [units, params] = await Promise.all([listProductUnits(), searchParams]);
  const successMessage = params.success ? successMessages[params.success] : undefined;

  return (
    <div className="mx-auto max-w-[1200px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Produk dan Stok</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Satuan Produk</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Atur satuan dasar dan faktor konversi penjualan untuk setiap produk.
          </p>
        </div>
        <Link href="/produk/satuan/baru" className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus size={16} aria-hidden="true" /> Tambah satuan
        </Link>
      </header>

      {successMessage && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</p>}
      {params.error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p>}

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Produk</th>
                <th className="px-5 py-3 font-medium">Satuan</th>
                <th className="px-5 py-3 text-right font-medium">Konversi</th>
                <th className="px-5 py-3 font-medium">Barcode</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-t align-top hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <p className="font-medium">{unit.product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{unit.product.productCode}</p>
                  </td>
                  <td className="px-5 py-4 font-medium">
                    {unit.unitName}
                    {unit.isBaseUnit && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Dasar</span>}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    {unit.conversionToBase.toString()} {unit.product.baseUnitName}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{unit.barcode ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${unit.isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {unit.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/produk/satuan/${unit.id}/edit`}
                        title="Edit satuan"
                        aria-label={`Edit satuan ${unit.product.name} - ${unit.unitName}`}
                        className="grid size-8 place-items-center rounded-md text-amber-700 hover:bg-amber-50"
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </Link>
                      {unit.isActive && !unit.isBaseUnit && <ArchiveProductUnitButton id={unit.id} name={`${unit.product.name} — ${unit.unitName}`} />}
                    </div>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">
                    Belum ada satuan produk.
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
