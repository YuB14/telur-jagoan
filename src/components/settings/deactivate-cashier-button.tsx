"use client";

import { Trash2 } from "lucide-react";

import { deactivateCashierAction } from "@/server/actions/settings";

export function DeactivateCashierButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deactivateCashierAction.bind(null, id)}>
      <button
        aria-label={`Nonaktifkan kasir ${name}`}
        className="grid size-8 place-items-center rounded-md text-rose-600 hover:bg-rose-50"
        onClick={(event) => {
          if (!window.confirm(`Nonaktifkan akun kasir ${name}?`)) event.preventDefault();
        }}
        title="Nonaktifkan kasir"
        type="submit"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </form>
  );
}
