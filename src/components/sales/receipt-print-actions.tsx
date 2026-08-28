"use client";

import Link from "next/link";
import { Printer, RotateCcw } from "lucide-react";

export function ReceiptPrintActions() {
  return (
    <div className="print:hidden grid gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        <Printer size={16} aria-hidden="true" />
        Cetak ulang
      </button>
      <Link
        href="/kasir/transaksi-baru"
        className="inline-flex h-11 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-semibold hover:bg-muted"
      >
        <RotateCcw size={16} aria-hidden="true" />
        Transaksi Baru
      </Link>
    </div>
  );
}
