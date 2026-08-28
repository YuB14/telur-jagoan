import Link from "next/link";
import {
  Banknote,
  BarChart3,
  CalendarRange,
  CircleDollarSign,
  Clock3,
  CreditCard,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import type { AppRole } from "@/lib/permissions";

type DecimalLike = { toString(): string };

type OwnerDashboardData = {
  summary: {
    salesTotal: DecimalLike;
    salesWeekTotal: DecimalLike;
    salesMonthTotal: DecimalLike;
    transactionCount: number;
    grossProfit: DecimalLike;
    expenseTotal: DecimalLike;
    purchaseMonthTotal: DecimalLike;
    supplierDebtTotal: DecimalLike;
    lowStockCount: number;
    openSessionCount: number;
  };
  dailyPerformance: Array<{
    dateKey: string;
    label: string;
    salesTotal: DecimalLike;
    grossProfit: DecimalLike;
  }>;
  recentSales: Array<{
    id: string;
    saleNumber: string;
    saleDate: Date;
    grandTotal: DecimalLike;
    customer: { name: string };
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    unitName: string;
    quantity: DecimalLike;
    subtotal: DecimalLike;
  }>;
  lowStockProducts: Array<{
    id: string;
    productCode: string;
    name: string;
    baseUnitName: string;
    minimumStock: DecimalLike;
    currentStock: DecimalLike;
  }>;
};

type DashboardOverviewProps = {
  name: string;
  role: AppRole;
  ownerData?: OwnerDashboardData;
};

const cashierStats = [
  { label: "Status sesi", icon: Clock3 },
  { label: "Modal awal", icon: Banknote },
  { label: "Penjualan hari ini", icon: CircleDollarSign },
  { label: "Jumlah transaksi", icon: ReceiptText },
  { label: "Pembayaran tunai", icon: Banknote },
  { label: "Pembayaran QRIS", icon: CreditCard },
  { label: "Pembayaran transfer", icon: WalletCards },
];

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const dateTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 3,
});

function formatMoney(value: DecimalLike) {
  return currency.format(Number(value.toString()));
}

function formatQuantity(value: DecimalLike) {
  return numberFormatter.format(Number(value.toString()));
}

function toNumber(value: DecimalLike) {
  return Number(value.toString());
}

export function DashboardOverview({ name, role, ownerData }: DashboardOverviewProps) {
  const isOwner = role === "OWNER";
  const chartWidth = 640;
  const chartHeight = 240;
  const chartPadding = { top: 18, right: 18, bottom: 42, left: 18 };
  const chartPlotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const chartPlotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const chartMaxValue = ownerData
    ? Math.max(
        1,
        ...ownerData.dailyPerformance.flatMap((item) => [
          toNumber(item.salesTotal),
          toNumber(item.grossProfit),
        ]),
      )
    : 1;
  const chartPointCount = ownerData?.dailyPerformance.length ?? 0;
  const getChartX = (index: number) =>
    chartPadding.left + (chartPointCount <= 1 ? chartPlotWidth / 2 : (index / (chartPointCount - 1)) * chartPlotWidth);
  const getChartY = (value: DecimalLike) =>
    chartPadding.top + chartPlotHeight - (toNumber(value) / chartMaxValue) * chartPlotHeight;
  const salesLinePoints = ownerData
    ? ownerData.dailyPerformance.map((item, index) => `${getChartX(index)},${getChartY(item.salesTotal)}`).join(" ")
    : "";
  const profitLinePoints = ownerData
    ? ownerData.dailyPerformance.map((item, index) => `${getChartX(index)},${getChartY(item.grossProfit)}`).join(" ")
    : "";
  const ownerStats = ownerData
    ? [
        { label: "Penjualan hari ini", value: formatMoney(ownerData.summary.salesTotal), icon: CircleDollarSign },
        { label: "Penjualan minggu ini", value: formatMoney(ownerData.summary.salesWeekTotal), icon: CalendarRange },
        { label: "Penjualan bulan ini", value: formatMoney(ownerData.summary.salesMonthTotal), icon: BarChart3 },
        { label: "Jumlah transaksi", value: String(ownerData.summary.transactionCount), icon: ReceiptText },
        { label: "Laba kotor hari ini", value: formatMoney(ownerData.summary.grossProfit), icon: TrendingUp },
        { label: "Pengeluaran hari ini", value: formatMoney(ownerData.summary.expenseTotal), icon: WalletCards },
        { label: "Pembelian bulan ini", value: formatMoney(ownerData.summary.purchaseMonthTotal), icon: ShoppingCart },
        { label: "Hutang supplier", value: formatMoney(ownerData.summary.supplierDebtTotal), icon: CreditCard },
        { label: "Produk hampir habis", value: String(ownerData.summary.lowStockCount), icon: PackageSearch },
        { label: "Sesi kasir aktif", value: String(ownerData.summary.openSessionCount), icon: Clock3 },
      ]
    : [];
  const stats = isOwner ? ownerStats : cashierStats.map((stat) => ({ ...stat, value: "-" }));

  return (
    <div className="mx-auto max-w-[1500px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">
          {isOwner ? "Dashboard Owner" : "Dashboard Kasir"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Selamat datang, {name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {isOwner
            ? "Ringkasan operasional, penjualan, stok, dan kas Telur Jagoan."
            : "Ringkasan sesi dan transaksi kasir Anda akan tampil di sini."}
        </p>
      </header>

      <section aria-label="Ringkasan dashboard" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                <Icon size={18} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold">{value}</p>
          </article>
        ))}
      </section>

      {isOwner && ownerData ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <article className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Grafik penjualan dan laba kotor</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Ringkasan 7 hari terakhir</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-primary" aria-hidden="true" />
                    Penjualan
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-emerald-500" aria-hidden="true" />
                    Laba kotor
                  </span>
                </div>
              </div>
              <div className="mt-5 overflow-x-auto pb-1">
                <div className="min-w-[620px]">
                  <svg
                    className="h-auto w-full overflow-visible"
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    role="img"
                    aria-label="Line chart penjualan dan laba kotor 7 hari terakhir"
                  >
                    <defs>
                      <linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map((line) => {
                      const y = chartPadding.top + (line / 3) * chartPlotHeight;

                      return (
                        <line
                          key={line}
                          x1={chartPadding.left}
                          x2={chartWidth - chartPadding.right}
                          y1={y}
                          y2={y}
                          stroke="var(--border)"
                          strokeDasharray={line === 3 ? undefined : "4 6"}
                        />
                      );
                    })}
                    {salesLinePoints && (
                      <polygon
                        points={`${chartPadding.left},${chartPadding.top + chartPlotHeight} ${salesLinePoints} ${chartWidth - chartPadding.right},${chartPadding.top + chartPlotHeight}`}
                        fill="url(#sales-area)"
                      />
                    )}
                    <polyline points={salesLinePoints} fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={profitLinePoints} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    {ownerData.dailyPerformance.map((item, index) => {
                      const x = getChartX(index);
                      const salesY = getChartY(item.salesTotal);
                      const profitY = getChartY(item.grossProfit);

                      return (
                        <g key={item.dateKey}>
                          <line x1={x} x2={x} y1={chartPadding.top} y2={chartPadding.top + chartPlotHeight} stroke="var(--border)" strokeOpacity="0.45" />
                          <circle cx={x} cy={salesY} r="5" fill="var(--card)" stroke="var(--primary)" strokeWidth="3">
                            <title>{`Penjualan ${item.label}: ${formatMoney(item.salesTotal)}`}</title>
                          </circle>
                          <circle cx={x} cy={profitY} r="5" fill="var(--card)" stroke="#10b981" strokeWidth="3">
                            <title>{`Laba kotor ${item.label}: ${formatMoney(item.grossProfit)}`}</title>
                          </circle>
                          <text x={x} y={chartHeight - 18} textAnchor="middle" className="fill-muted-foreground text-[12px] font-semibold">
                            {item.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="grid grid-cols-7 gap-2 px-1 text-center text-[11px]">
                    {ownerData.dailyPerformance.map((item) => (
                      <div key={item.dateKey} className="min-w-0">
                        <p className="truncate text-muted-foreground">{formatMoney(item.salesTotal)}</p>
                        <p className="truncate text-emerald-600">{formatMoney(item.grossProfit)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Transaksi terakhir</h2>
                <Link href="/penjualan" className="text-sm font-medium text-primary hover:underline">
                  Lihat semua
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {ownerData.recentSales.map((sale) => (
                  <Link key={sale.id} href={`/penjualan/${sale.id}`} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm hover:bg-muted/40">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{sale.saleNumber}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {sale.customer.name} - {dateTime.format(sale.saleDate)}
                      </span>
                    </span>
                    <strong className="shrink-0">{formatMoney(sale.grandTotal)}</strong>
                  </Link>
                ))}
                {!ownerData.recentSales.length && (
                  <p className="rounded-lg bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
                    Belum ada transaksi penjualan.
                  </p>
                )}
              </div>
            </article>
          </div>

          <div className="space-y-4">
            <article className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">Produk terlaris hari ini</h2>
              <div className="mt-4 space-y-3">
                {ownerData.topProducts.map((product) => (
                  <div key={product.productId} className="flex items-center justify-between gap-3 rounded-lg bg-muted/45 px-4 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{product.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatQuantity(product.quantity)} {product.unitName}
                      </span>
                    </span>
                    <strong className="shrink-0">{formatMoney(product.subtotal)}</strong>
                  </div>
                ))}
                {!ownerData.topProducts.length && (
                  <p className="rounded-lg bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                    Belum ada produk terjual hari ini.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">Stok perlu dicek</h2>
              <div className="mt-4 space-y-3">
                {ownerData.lowStockProducts.map((product) => (
                  <Link key={product.id} href={`/produk/${product.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-muted/45 px-4 py-3 text-sm hover:bg-muted">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{product.name}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{product.productCode}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs font-medium text-rose-600">
                      {formatQuantity(product.currentStock)} / {formatQuantity(product.minimumStock)} {product.baseUnitName}
                    </span>
                  </Link>
                ))}
                {!ownerData.lowStockProducts.length && (
                  <p className="rounded-lg bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                    Tidak ada produk di bawah batas minimum.
                  </p>
                )}
              </div>
            </article>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          <article className="min-h-56 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Transaksi terakhir</h2>
            <p className="mt-1 text-sm text-muted-foreground">Buka menu kasir untuk melihat ringkasan sesi.</p>
          </article>
          <article className="min-h-56 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Pembayaran hari ini</h2>
            <p className="mt-1 text-sm text-muted-foreground">Buka menu kasir untuk melihat pembayaran per metode.</p>
          </article>
        </section>
      )}
    </div>
  );
}
