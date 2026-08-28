import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SaleReturnForm } from "@/components/sales/sale-return-form";
import { getSaleDetail, SaleServiceError } from "@/server/services/sales";

export const metadata: Metadata = { title: "Retur Penjualan | Telur Jagoan" };

type SaleReturnPageProps = { params: Promise<{ id: string }> };

export default async function SaleReturnPage({ params }: SaleReturnPageProps) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof getSaleDetail>>;

  try {
    data = await getSaleDetail(id);
  } catch (error) {
    if (error instanceof SaleServiceError) notFound();
    throw error;
  }

  if (data.role !== "OWNER") {
    redirect("/penjualan");
  }

  const returnableItems = data.items
    .filter((item) => item.returnableQuantity.greaterThan(0))
    .map((item) => ({
      id: item.id,
      productNameSnapshot: item.productNameSnapshot,
      unitNameSnapshot: item.unitNameSnapshot,
      baseUnitName: item.product.baseUnitName,
      returnableQuantity: item.returnableQuantity.toString(),
    }));

  return (
    <div className="mx-auto max-w-[1100px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Penjualan</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Retur Penjualan {data.sale.saleNumber}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Retur wajib disetujui Owner. Stok dikembalikan ke batch asal dan kas berkurang dalam satu transaksi database.
        </p>
      </header>

      <SaleReturnForm
        saleId={data.sale.id}
        saleNumber={data.sale.saleNumber}
        items={returnableItems}
      />
    </div>
  );
}
