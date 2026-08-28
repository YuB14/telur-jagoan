import type { Metadata } from "next";

import { CashierForm } from "@/components/settings/cashier-form";

export const metadata: Metadata = { title: "Tambah Kasir | Telur Jagoan" };

export default function NewCashierPage() {
  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Pengguna</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tambah Kasir</h1>
      </header>
      <CashierForm />
    </div>
  );
}
