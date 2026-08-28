import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { DeactivateCashierButton } from "@/components/settings/deactivate-cashier-button";
import { listCashiers } from "@/server/services/settings";

export const metadata: Metadata = { title: "Data Kasir | Telur Jagoan" };

type CashiersPageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

const successMessages: Record<string, string> = {
  created: "Akun kasir berhasil ditambahkan.",
  updated: "Akun kasir berhasil diperbarui.",
  deactivated: "Akun kasir berhasil dinonaktifkan.",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function CashiersPage({ searchParams }: CashiersPageProps) {
  const [cashiers, params] = await Promise.all([listCashiers(), searchParams]);

  return (
    <div className="mx-auto max-w-[1100px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Pengguna</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Data Kasir</h1>
          <p className="mt-2 text-sm text-muted-foreground">Kelola akun kasir. Owner tidak dikelola dari halaman ini.</p>
        </div>
        <Link className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90" href="/pengguna/kasir/baru">
          <Plus size={16} aria-hidden="true" /> Tambah Kasir
        </Link>
      </header>
      {params.success && successMessages[params.success] && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessages[params.success]}</p>}
      {params.error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p>}
      <section className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-5 py-3">Nama</th><th className="px-5 py-3">Username</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Telepon</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Login terakhir</th><th className="px-5 py-3 text-right">Aksi</th></tr>
          </thead>
          <tbody>
            {cashiers.map((cashier) => (
              <tr key={cashier.id} className="border-t hover:bg-muted/30">
                <td className="px-5 py-4 font-semibold">{cashier.name}</td>
                <td className="px-5 py-4">{cashier.username}</td>
                <td className="px-5 py-4">{cashier.email}</td>
                <td className="px-5 py-4">{cashier.phone}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cashier.isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{cashier.isActive ? "Aktif" : "Nonaktif"}</span></td>
                <td className="px-5 py-4 text-muted-foreground">{cashier.lastLoginAt ? dateFormatter.format(cashier.lastLoginAt) : "-"}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Link
                      className="grid size-8 place-items-center rounded-md text-amber-700 hover:bg-amber-50"
                      href={`/pengguna/kasir/${cashier.id}/edit`}
                      title="Edit kasir"
                      aria-label={`Edit kasir ${cashier.name}`}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </Link>
                    {cashier.isActive && <DeactivateCashierButton id={cashier.id} name={cashier.name} />}
                  </div>
                </td>
              </tr>
            ))}
            {!cashiers.length && <tr><td className="px-5 py-16 text-center text-muted-foreground" colSpan={7}>Belum ada akun kasir.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
