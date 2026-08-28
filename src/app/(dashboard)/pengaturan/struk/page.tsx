import type { Metadata } from "next";

import { ReceiptSettingsForm } from "@/components/settings/receipt-settings-form";
import { getReceiptSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Pengaturan Struk | Telur Jagoan" };

type ReceiptSettingsPageProps = {
  searchParams: Promise<{ success?: string }>;
};

export default async function ReceiptSettingsPage({ searchParams }: ReceiptSettingsPageProps) {
  const [settings, params] = await Promise.all([getReceiptSettings(), searchParams]);
  const receiptSettings = {
    storeName: settings.storeName,
    logoUrl: settings.logoUrl,
    address: settings.address,
    phone: settings.phone,
    receiptFooter: settings.receiptFooter,
  };

  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Pengaturan</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pengaturan Struk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Logo toko, nama toko, nomor telepon, alamat, dan pesan footer struk.
        </p>
      </header>
      {params.success === "updated" && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Pengaturan struk berhasil disimpan.</p>}
      <ReceiptSettingsForm settings={receiptSettings} />
    </div>
  );
}
