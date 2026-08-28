"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";

import { archiveProductCategoryAction } from "@/server/actions/product-categories";

function ArchiveSubmitButton({ name }: { name: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title="Nonaktifkan kategori"
      aria-label={`Nonaktifkan kategori ${name}`}
      className="grid size-8 place-items-center rounded-md text-rose-600 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
    >
      <Trash2 size={16} aria-hidden="true" />
    </button>
  );
}

export function ArchiveProductCategoryButton({ id, name }: { id: string; name: string }) {
  const action = archiveProductCategoryAction.bind(null, id);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Nonaktifkan kategori “${name}”? Produk yang sudah memakai kategori ini tetap terhubung.`)) {
          event.preventDefault();
        }
      }}
    >
      <ArchiveSubmitButton name={name} />
    </form>
  );
}
