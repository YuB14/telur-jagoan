"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";

import { archiveCustomerAction } from "@/server/actions/customers";

function ArchiveSubmitButton({ name }: { name: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title="Nonaktifkan pelanggan"
      aria-label={`Nonaktifkan pelanggan ${name}`}
      className="grid size-8 place-items-center rounded-md text-rose-600 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
    >
      <Trash2 size={16} aria-hidden="true" />
    </button>
  );
}

export function ArchiveCustomerButton({ id, name }: { id: string; name: string }) {
  const action = archiveCustomerAction.bind(null, id);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Nonaktifkan pelanggan “${name}”? Riwayat transaksi tetap tersimpan.`)) {
          event.preventDefault();
        }
      }}
    >
      <ArchiveSubmitButton name={name} />
    </form>
  );
}
