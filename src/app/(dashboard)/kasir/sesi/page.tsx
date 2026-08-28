import type { Metadata } from "next";

import { listCashSessions } from "@/server/services/cash-sessions";

export const metadata: Metadata = { title: "Sesi Kasir Aktif | Telur Jagoan" };

const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function ActiveCashSessionsPage() {
  const sessions = await listCashSessions("OPEN");

  return (
    <div className="mx-auto max-w-[1300px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Kasir</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sesi Kasir Aktif</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pantau sesi kasir yang sedang berjalan.</p>
      </header>
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-5 py-3">Sesi</th><th className="px-5 py-3">Kasir</th><th className="px-5 py-3">Perangkat</th><th className="px-5 py-3">Dibuka</th><th className="px-5 py-3 text-right">Modal Awal</th><th className="px-5 py-3 text-right">Penjualan</th></tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-t hover:bg-muted/30">
                  <td className="px-5 py-4 font-semibold">{session.sessionNumber}</td>
                  <td className="px-5 py-4">{session.cashier.name}<p className="text-xs text-muted-foreground">{session.cashier.username}</p></td>
                  <td className="px-5 py-4">{session.cashRegister.code} - {session.cashRegister.name}</td>
                  <td className="px-5 py-4">{dateTime.format(session.openedAt)}</td>
                  <td className="px-5 py-4 text-right">{currency.format(Number(session.openingCash))}</td>
                  <td className="px-5 py-4 text-right font-semibold">{currency.format(session.sales.reduce((total, sale) => total + Number(sale.grandTotal), 0))}</td>
                </tr>
              ))}
              {!sessions.length && <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">Tidak ada sesi kasir aktif.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
