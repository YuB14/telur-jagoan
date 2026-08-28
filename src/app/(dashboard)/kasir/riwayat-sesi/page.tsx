import type { Metadata } from "next";

import { listCashSessions } from "@/server/services/cash-sessions";

export const metadata: Metadata = { title: "Riwayat Sesi Kasir | Telur Jagoan" };

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function CashSessionHistoryPage() {
  const sessions = await listCashSessions();

  return (
    <div className="mx-auto max-w-[1400px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Kasir</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Riwayat Sesi Kasir</h1>
        <p className="mt-2 text-sm text-muted-foreground">Rekonsiliasi modal awal, kas seharusnya, kas fisik, dan selisih.</p>
      </header>
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-5 py-3">Sesi</th><th className="px-5 py-3">Kasir</th><th className="px-5 py-3">Dibuka</th><th className="px-5 py-3">Ditutup</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Penjualan</th><th className="px-5 py-3 text-right">Kas Seharusnya</th><th className="px-5 py-3 text-right">Kas Fisik</th><th className="px-5 py-3 text-right">Selisih</th></tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-t hover:bg-muted/30">
                  <td className="px-5 py-4 font-semibold">{session.sessionNumber}</td>
                  <td className="px-5 py-4">{session.cashier.name}</td>
                  <td className="px-5 py-4">{dateTime.format(session.openedAt)}</td>
                  <td className="px-5 py-4">{session.closedAt ? dateTime.format(session.closedAt) : "-"}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${session.status === "OPEN" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{session.status}</span></td>
                  <td className="px-5 py-4 text-right">{currency.format(session.sales.reduce((total, sale) => total + Number(sale.grandTotal), 0))}</td>
                  <td className="px-5 py-4 text-right">{session.expectedCash ? currency.format(Number(session.expectedCash)) : "-"}</td>
                  <td className="px-5 py-4 text-right">{session.actualCash ? currency.format(Number(session.actualCash)) : "-"}</td>
                  <td className={`px-5 py-4 text-right font-semibold ${session.cashDifference && !session.cashDifference.equals(0) ? "text-rose-600" : ""}`}>{session.cashDifference ? currency.format(Number(session.cashDifference)) : "-"}</td>
                </tr>
              ))}
              {!sessions.length && <tr><td colSpan={9} className="px-5 py-16 text-center text-muted-foreground">Belum ada riwayat sesi kasir.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
