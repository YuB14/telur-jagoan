"use client";

import { Trash2 } from "lucide-react";

type FinanceDeleteButtonProps = {
  action: () => Promise<void>;
  label: string;
};

export function FinanceDeleteButton({ action, label }: FinanceDeleteButtonProps) {
  return (
    <form action={action}>
      <button
        aria-label={label}
        className="grid size-8 place-items-center rounded-md text-rose-600 hover:bg-rose-50"
        onClick={(event) => {
          if (!window.confirm(`${label}? Data akan dihapus secara soft-delete dan kas terkait dikoreksi.`)) {
            event.preventDefault();
          }
        }}
        title={label}
        type="submit"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </form>
  );
}
