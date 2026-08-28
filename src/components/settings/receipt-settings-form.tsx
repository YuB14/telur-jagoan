"use client";

import Image from "next/image";
import { useActionState, useState, type ChangeEvent } from "react";
import { ImagePlus, Store, Trash2 } from "lucide-react";

import {
  type SettingsActionState,
  updateReceiptSettingsAction,
} from "@/server/actions/settings";

type ReceiptSettingsValue = {
  storeName: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  receiptFooter: string | null;
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function ReceiptSettingsForm({ settings }: { settings: ReceiptSettingsValue }) {
  const [state, formAction, pending] = useActionState(updateReceiptSettingsAction, {} satisfies SettingsActionState);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setRemoveExisting(false);
    } else {
      setPreviewUrl(null);
    }
  }

  const activeLogo = previewUrl || (!removeExisting ? settings.logoUrl : null);

  return (
    <form action={formAction} className="space-y-6 rounded-xl border bg-card p-6">
      {state.message && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      {/* Informasi Toko & Kontak */}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nama toko di struk</span>
          <input
            name="storeName"
            type="text"
            required
            maxLength={150}
            defaultValue={settings.storeName}
            placeholder="Contoh: Telur Jagoan"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <FieldError errors={state.errors?.storeName} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nomor telepon</span>
          <input
            name="phone"
            type="tel"
            defaultValue={settings.phone ?? ""}
            placeholder="Contoh: 081234567890"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-xs text-muted-foreground">Format nomor Indonesia (08... atau +62...)</p>
          <FieldError errors={state.errors?.phone} />
        </label>
      </div>

      {/* Upload Logo Toko dari Laptop */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <label htmlFor="store-logo" className="mb-2 flex items-center gap-2 text-sm font-medium">
          <ImagePlus size={17} className="text-primary" />
          Logo toko untuk struk
        </label>

        {activeLogo && (
          <div className="mb-4 flex items-center gap-4 rounded-lg border bg-card p-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted/40">
              <Image
                src={activeLogo}
                alt="Pratinjau Logo Toko"
                fill
                sizes="64px"
                className="object-contain p-1"
                unoptimized={activeLogo.startsWith("blob:")}
              />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-semibold text-foreground">
                {previewUrl ? "Logo baru yang akan disimpan" : "Logo saat ini terpasang"}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Logo ini akan dicetak di bagian paling atas struk belanja.
              </p>
            </div>
            {settings.logoUrl && !previewUrl && (
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">
                <input
                  name="removeLogo"
                  type="checkbox"
                  checked={removeExisting}
                  onChange={(e) => setRemoveExisting(e.target.checked)}
                  className="size-3.5 accent-rose-600"
                />
                <Trash2 size={13} />
                Hapus logo
              </label>
            )}
          </div>
        )}

        <input
          id="store-logo"
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="block w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Pilih file gambar dari laptop (Format: JPG, PNG, atau WebP. Maksimal 5MB).
        </p>
        <FieldError errors={state.errors?.logo} />
      </div>

      {/* Alamat Toko */}
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Alamat toko</span>
        <textarea
          name="address"
          rows={3}
          defaultValue={settings.address ?? ""}
          placeholder="Alamat lengkap toko yang tercantum di struk"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <FieldError errors={state.errors?.address} />
      </label>

      {/* Footer Struk */}
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Pesan footer struk</span>
        <textarea
          name="receiptFooter"
          rows={2}
          defaultValue={settings.receiptFooter ?? ""}
          placeholder="Contoh: Terima kasih sudah belanja di Telur Jagoan. Barang yang dibeli tidak dapat ditukar."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <FieldError errors={state.errors?.receiptFooter} />
      </label>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan pengaturan struk"}
        </button>
      </div>
    </form>
  );
}
