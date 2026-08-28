"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { CurrencyInput } from "@/components/ui/currency-input";
import {
  createPurchaseDraftAction,
  type PurchaseActionState,
} from "@/server/actions/purchases";

type ProductOption = {
  id: string;
  productCode: string;
  name: string;
  baseUnitName: string;
  units: Array<{
    id: string;
    unitName: string;
    conversionToBase: string;
  }>;
};

type PurchaseFormProps = {
  products: ProductOption[];
  paymentMethods: Array<{ id: string; code: string; name: string; type: string }>;
  defaultPurchaseDate: string;
};

type ItemRow = {
  key: string;
  productUnitId: string;
  quantity: string;
  unitCost: string;
  discountAmount: string;
  expiryDate: string;
};

const inputClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/25";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});

function createItem(productUnitId = ""): ItemRow {
  return {
    key: crypto.randomUUID(),
    productUnitId,
    quantity: "1",
    unitCost: "",
    discountAmount: "0",
    expiryDate: "",
  };
}

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-rose-600">{errors[0]}</p>;
}

export function PurchaseForm({
  products,
  paymentMethods,
  defaultPurchaseDate,
}: PurchaseFormProps) {
  const unitOptions = useMemo(
    () =>
      products.flatMap((product) =>
        product.units.map((unit) => ({
          ...unit,
          productId: product.id,
          productCode: product.productCode,
          productName: product.name,
          baseUnitName: product.baseUnitName,
        })),
      ),
    [products],
  );
  const firstUnitId = unitOptions[0]?.id ?? "";
  const [items, setItems] = useState<ItemRow[]>(() => [createItem(firstUnitId)]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [shippingCost, setShippingCost] = useState("0");
  const [otherCost, setOtherCost] = useState("0");
  const [purchaseNumberMode, setPurchaseNumberMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [paymentMode, setPaymentMode] = useState<"PAID" | "DEBT">("PAID");
  const [amountPaid, setAmountPaid] = useState("0");
  const initialState: PurchaseActionState = {};
  const [state, formAction, pending] = useActionState(
    createPurchaseDraftAction,
    initialState,
  );

  const subtotal = items.reduce(
    (total, item) =>
      total +
      Math.max(
        0,
        toNumber(item.quantity) * toNumber(item.unitCost) -
          toNumber(item.discountAmount),
      ),
    0,
  );
  const grandTotal = Math.max(
    0,
    subtotal - toNumber(discountAmount) + toNumber(shippingCost) + toNumber(otherCost),
  );
  const effectiveAmountPaid = paymentMode === "PAID" ? grandTotal : toNumber(amountPaid);
  const remainingDebt = Math.max(0, grandTotal - effectiveAmountPaid);
  const serializedItems = JSON.stringify(
    items.map(({ productUnitId, quantity, unitCost, discountAmount: itemDiscount, expiryDate }) => ({
      productUnitId,
      quantity,
      unitCost,
      discountAmount: itemDiscount,
      expiryDate,
    })),
  );

  function updateItem(key: string, field: keyof Omit<ItemRow, "key">, value: string) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    );
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="items" value={serializedItems} />

      {state.message && (
        <p role="alert" aria-live="polite" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <section className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <h2 className="font-semibold">Informasi Pembelian</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Supplier diketik bebas; sistem akan mencari atau membuat record internal otomatis.
          </p>
        </div>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium">Nama supplier</span>
          <input name="supplierName" required maxLength={150} className={inputClassName} placeholder="Ketik nama supplier" />
          <FieldError errors={state.errors?.supplierName} />
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Nomor transaksi pembelian</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="purchaseNumberMode" value="AUTO" checked={purchaseNumberMode === "AUTO"} onChange={() => setPurchaseNumberMode("AUTO")} className="accent-primary" />
              Gunakan nomor otomatis
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="purchaseNumberMode" value="MANUAL" checked={purchaseNumberMode === "MANUAL"} onChange={() => setPurchaseNumberMode("MANUAL")} className="accent-primary" />
              Nomor manual
            </label>
          </div>
          <input name="customPurchaseNumber" maxLength={50} disabled={purchaseNumberMode === "AUTO"} className={inputClassName} placeholder="TJ-PUR-20260810-0001" />
          <FieldError errors={state.errors?.customPurchaseNumber} />
        </fieldset>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Nomor nota supplier</span>
          <input name="supplierInvoiceNumber" maxLength={100} className={inputClassName} placeholder="Opsional" />
          <FieldError errors={state.errors?.supplierInvoiceNumber} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Tanggal pembelian/kulakan</span>
          <input name="purchaseDate" type="date" required defaultValue={defaultPurchaseDate} className={inputClassName} />
          <FieldError errors={state.errors?.purchaseDate} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Tanggal pengingat jatuh tempo</span>
          <input name="dueDate" type="date" disabled={paymentMode === "PAID"} className={inputClassName} />
          <FieldError errors={state.errors?.dueDate} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Catatan</span>
          <input name="notes" maxLength={5_000} className={inputClassName} placeholder="Opsional" />
          <FieldError errors={state.errors?.notes} />
        </label>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Item Pembelian</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pilih produk/satuan, jumlah, harga beli, diskon item, dan tanggal kedaluwarsa.
            </p>
          </div>
          <button type="button" onClick={() => setItems((current) => [...current, createItem(firstUnitId)])} disabled={!firstUnitId} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
            <Plus size={15} aria-hidden="true" /> Tambah item
          </button>
        </div>
        <FieldError errors={state.errors?.items} />

        <div className="space-y-4">
          {items.map((item, index) => {
            const selectedUnit = unitOptions.find((unit) => unit.id === item.productUnitId);
            const itemSubtotal = Math.max(0, toNumber(item.quantity) * toNumber(item.unitCost) - toNumber(item.discountAmount));

            return (
              <article key={item.key} className="rounded-lg border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold">Item {index + 1}</p>
                  <button type="button" onClick={() => removeItem(item.key)} disabled={items.length === 1} aria-label={`Hapus item ${index + 1}`} className="inline-flex size-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 disabled:opacity-30">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <label className="block md:col-span-2 xl:col-span-2">
                    <span className="mb-2 block text-xs font-medium">Produk / Satuan</span>
                    <select value={item.productUnitId} onChange={(event) => updateItem(item.key, "productUnitId", event.target.value)} required className={inputClassName}>
                      <option value="" disabled>Pilih satuan produk</option>
                      {unitOptions.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.productCode} — {unit.productName} / {unit.unitName}
                        </option>
                      ))}
                    </select>
                    {selectedUnit && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        1 {selectedUnit.unitName} = {selectedUnit.conversionToBase} {selectedUnit.baseUnitName}
                      </p>
                    )}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium">Jumlah</span>
                    <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(item.key, "quantity", event.target.value)} required className={inputClassName} />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium">Harga beli/satuan</span>
                    <CurrencyInput value={item.unitCost} onValueChange={(value) => updateItem(item.key, "unitCost", value)} required className={inputClassName} placeholder="Rp 0" />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium">Diskon item</span>
                    <CurrencyInput value={item.discountAmount} onValueChange={(value) => updateItem(item.key, "discountAmount", value)} required className={inputClassName} />
                  </label>

                  <label className="block md:col-span-2 xl:col-span-2">
                    <span className="mb-2 block text-xs font-medium">Tanggal kedaluwarsa</span>
                    <input type="date" value={item.expiryDate} onChange={(event) => updateItem(item.key, "expiryDate", event.target.value)} className={inputClassName} />
                  </label>

                  <div className="md:col-span-2 xl:col-span-3 xl:text-right">
                    <span className="block text-xs font-medium text-muted-foreground">Subtotal item</span>
                    <strong className="mt-2 block text-base">{currencyFormatter.format(itemSubtotal)}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Diskon transaksi</span>
            <CurrencyInput name="discountAmount" value={discountAmount} onValueChange={setDiscountAmount} required className={inputClassName} />
            <FieldError errors={state.errors?.discountAmount} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Ongkir</span>
            <CurrencyInput name="shippingCost" value={shippingCost} onValueChange={setShippingCost} required className={inputClassName} />
            <FieldError errors={state.errors?.shippingCost} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Biaya lain</span>
            <CurrencyInput name="otherCost" value={otherCost} onValueChange={setOtherCost} required className={inputClassName} />
            <FieldError errors={state.errors?.otherCost} />
          </label>
        </div>

        <dl className="space-y-3 rounded-lg bg-muted/50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Subtotal item</dt>
            <dd className="font-medium">{currencyFormatter.format(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Diskon transaksi</dt>
            <dd>-{currencyFormatter.format(toNumber(discountAmount))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Biaya tambahan</dt>
            <dd>{currencyFormatter.format(toNumber(shippingCost) + toNumber(otherCost))}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t pt-3 text-base">
            <dt className="font-semibold">Grand total</dt>
            <dd className="font-bold text-primary">{currencyFormatter.format(grandTotal)}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-6 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Status pembayaran</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-lg border p-3 ${paymentMode === "PAID" ? "border-primary bg-primary/5" : ""}`}>
                <input type="radio" name="paymentMode" value="PAID" checked={paymentMode === "PAID"} onChange={() => setPaymentMode("PAID")} className="mr-2 accent-primary" />
                <span className="font-semibold">Lunas</span>
                <span className="mt-1 block text-xs text-muted-foreground">Dibayar penuh; jatuh tempo disimpan NULL.</span>
              </label>
              <label className={`cursor-pointer rounded-lg border p-3 ${paymentMode === "DEBT" ? "border-primary bg-primary/5" : ""}`}>
                <input type="radio" name="paymentMode" value="DEBT" checked={paymentMode === "DEBT"} onChange={() => setPaymentMode("DEBT")} className="mr-2 accent-primary" />
                <span className="font-semibold">Hutang</span>
                <span className="mt-1 block text-xs text-muted-foreground">Wajib isi jatuh tempo; pembayaran awal boleh 0.</span>
              </label>
            </div>
            <FieldError errors={state.errors?.paymentMode} />
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Metode pembayaran</span>
              <select name="paymentMethodId" defaultValue="" className={inputClassName}>
                <option value="">Pilih metode</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.code} — {method.name}
                  </option>
                ))}
              </select>
              <FieldError errors={state.errors?.paymentMethodId} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Dibayar sekarang</span>
              <CurrencyInput name="amountPaid" value={paymentMode === "PAID" ? grandTotal.toFixed(0) : amountPaid} onValueChange={setAmountPaid} readOnly={paymentMode === "PAID"} required className={inputClassName} />
              <FieldError errors={state.errors?.amountPaid} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Nomor referensi</span>
              <input name="referenceNumber" maxLength={100} className={inputClassName} placeholder="Opsional" />
              <FieldError errors={state.errors?.referenceNumber} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Bukti pembayaran</span>
              <input name="receiptFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="block w-full text-sm" />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Catatan pembayaran</span>
            <textarea name="paymentNotes" maxLength={5_000} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/25" placeholder="Opsional" />
            <FieldError errors={state.errors?.paymentNotes} />
          </label>
        </div>

        <dl className="h-fit space-y-3 rounded-lg bg-muted/50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Grand total</dt>
            <dd className="font-medium">{currencyFormatter.format(grandTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Dibayar</dt>
            <dd>{currencyFormatter.format(effectiveAmountPaid)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t pt-3 text-base">
            <dt className="font-semibold">Sisa hutang</dt>
            <dd className="font-bold text-primary">{currencyFormatter.format(remainingDebt)}</dd>
          </div>
        </dl>
      </section>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Saat disimpan, pembelian langsung membuat batch, menambah stok, mencatat stock movement, dan mencatat pembayaran dalam satu transaksi database.
      </p>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/pembelian" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Batal
        </Link>
        <button type="submit" disabled={pending || !unitOptions.length} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
          {pending ? "Menyimpan..." : "Simpan pembelian"}
        </button>
      </div>
    </form>
  );
}
