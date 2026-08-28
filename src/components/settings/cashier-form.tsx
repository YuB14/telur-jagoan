"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createCashierAction,
  type SettingsActionState,
  updateCashierAction,
} from "@/server/actions/settings";

type CashierValue = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  isActive: boolean;
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function CashierForm({ cashier }: { cashier?: CashierValue }) {
  const action = cashier ? updateCashierAction.bind(null, cashier.id) : createCashierAction;
  const [state, formAction, pending] = useActionState(action, {} satisfies SettingsActionState);

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-card p-6">
      {state.message && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-2 block text-sm font-medium">Nama</span><input className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={cashier?.name ?? ""} name="name" /><FieldError errors={state.errors?.name} /></label>
        <label className="block"><span className="mb-2 block text-sm font-medium">Username</span><input className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={cashier?.username ?? ""} name="username" /><FieldError errors={state.errors?.username} /></label>
        <label className="block"><span className="mb-2 block text-sm font-medium">Email</span><input className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={cashier?.email ?? ""} name="email" type="email" /><FieldError errors={state.errors?.email} /></label>
        <label className="block"><span className="mb-2 block text-sm font-medium">Nomor telepon</span><input className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={cashier?.phone ?? ""} name="phone" placeholder="081234567890" /><FieldError errors={state.errors?.phone} /></label>
      </div>
      <label className="block"><span className="mb-2 block text-sm font-medium">{cashier ? "Password baru (opsional)" : "Password"}</span><input className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="password" type="password" /><FieldError errors={state.errors?.password} /></label>
      <label className="flex items-center gap-2 text-sm font-medium"><input defaultChecked={cashier?.isActive ?? true} name="isActive" type="checkbox" /> Akun aktif</label>
      <div className="flex justify-end gap-3"><Link className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted" href="/pengguna/kasir">Batal</Link><button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" disabled={pending} type="submit">{pending ? "Menyimpan..." : cashier ? "Simpan perubahan" : "Tambah kasir"}</button></div>
    </form>
  );
}
