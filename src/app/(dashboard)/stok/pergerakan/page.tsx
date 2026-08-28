import type { Metadata } from "next";

import { listStockMovements } from "@/server/services/stock-movements";

export const metadata: Metadata = { title: "Pergerakan Stok | Telur Jagoan" };

const quantity = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });
const dateTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function StockMovementsPage() {
  const { movements, audit } = await listStockMovements();
  const auditPassed = audit.issues.length === 0;

  return (
    <div className="mx-auto max-w-[1400px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Persediaan</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pergerakan Stok</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Jejak perubahan stok. Riwayat dibatasi pada 250 movement terbaru.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Movement ditampilkan</p>
          <p className="mt-2 text-2xl font-bold">{movements.length}</p>
        </article>
        <article className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Item pembelian diterima</p>
          <p className="mt-2 text-2xl font-bold">{audit.receivedItemCount}</p>
        </article>
        <article className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Status audit pembelian</p>
          <p className={`mt-2 text-lg font-bold ${auditPassed ? "text-emerald-700" : "text-rose-700"}`}>
            {auditPassed ? "Konsisten" : `${audit.issues.length} masalah`}
          </p>
        </article>
      </section>

      {!auditPassed && (
        <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
          <h2 className="font-semibold">Audit stok masuk perlu ditinjau</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {audit.issues.slice(0, 20).map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Movement / Waktu</th>
                <th className="px-5 py-3 font-medium">Produk</th>
                <th className="px-5 py-3 font-medium">Tipe / Batch</th>
                <th className="px-5 py-3 text-right font-medium">Masuk</th>
                <th className="px-5 py-3 text-right font-medium">Keluar</th>
                <th className="px-5 py-3 text-right font-medium">Sebelum</th>
                <th className="px-5 py-3 text-right font-medium">Sesudah</th>
                <th className="px-5 py-3 font-medium">Referensi / Petugas</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-t align-top hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{movement.movementNumber}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{dateTime.format(movement.createdAt)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium">{movement.product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{movement.product.productCode}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {movement.movementType}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {movement.inventoryBatch?.batchNumber ?? "Tanpa batch"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-emerald-700">
                    {quantity.format(Number(movement.quantityIn))} {movement.product.baseUnitName}
                  </td>
                  <td className="px-5 py-4 text-right text-rose-700">
                    {quantity.format(Number(movement.quantityOut))}
                  </td>
                  <td className="px-5 py-4 text-right">{quantity.format(Number(movement.stockBefore))}</td>
                  <td className="px-5 py-4 text-right font-medium">{quantity.format(Number(movement.stockAfter))}</td>
                  <td className="px-5 py-4">
                    <p>{movement.referenceType ?? "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{movement.description ?? "Tanpa keterangan"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Oleh {movement.creator.name}</p>
                  </td>
                </tr>
              ))}
              {!movements.length && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-muted-foreground">
                    Belum ada pergerakan stok.
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
