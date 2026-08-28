import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { listProductPrices } from "@/server/services/product-prices";

export const metadata: Metadata = {
  title: "Harga Produk | Telur Jagoan",
};

type ProductPricesPageProps = {
  searchParams: Promise<{ success?: string }>;
};

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default async function ProductPricesPage({ searchParams }: ProductPricesPageProps) {
  const [units, params] = await Promise.all([listProductPrices(), searchParams]);

  return (
    <div className="mx-auto max-w-[1200px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Produk dan Stok</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Harga Produk</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Tetapkan harga jual untuk setiap satuan. Produk berbasis kilogram memakai harga per kg yang disimpan secara statis oleh Owner.
        </p>
      </header>

      {params.success === "updated" && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Harga produk berhasil diperbarui.
        </p>
      )}

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Produk</th>
                <th className="px-5 py-3 font-medium">Satuan</th>
                <th className="px-5 py-3 text-right font-medium">Harga jual</th>
                <th className="px-5 py-3 text-right font-medium">Harga grosir</th>
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
                  <td className="px-5 py-4">
                    <p className="font-medium">{unit.unitName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Konversi {unit.conversionToBase.toString()} {unit.product.baseUnitName}
                    </p>
                    {unit.isKilogramPrice && (
                      <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Harga kg statis
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums">
                    {rupiahFormatter.format(unit.sellingPrice.toNumber())}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-muted-foreground">
                    {unit.wholesalePrice ? rupiahFormatter.format(unit.wholesalePrice.toNumber()) : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${unit.isActive && unit.product.isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {unit.isActive && unit.product.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/produk/harga/${unit.id}/edit`}
                      title="Edit harga"
                      aria-label={`Edit harga ${unit.product.name} - ${unit.unitName}`}
                      className="ml-auto grid size-8 place-items-center rounded-md text-amber-700 hover:bg-amber-50"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">
                    Belum ada satuan produk. Tambahkan satuan terlebih dahulu melalui menu Satuan Produk.
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
