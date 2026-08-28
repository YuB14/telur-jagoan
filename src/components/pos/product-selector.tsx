"use client";

import Image from "next/image";
import { Banknote, Plus, Search, ShoppingBasket, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { PRODUCT_IMAGE_BLUR_DATA_URL } from "@/lib/product-image";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  addDecimalValues,
  calculateCartSubtotal,
  calculateLineSubtotal,
  formatIdDecimal,
  formatIdrDecimal,
} from "@/lib/sale-calculation";
import {
  createPosSaleAction,
  type PosCheckoutActionState,
} from "@/server/actions/pos";

type PosProduct = {
  id: string;
  productCode: string;
  barcode: string | null;
  name: string;
  imageUrl: string | null;
  baseUnitName: string;
  currentStock: string;
  category: { name: string } | null;
  units: Array<{
    id: string;
    unitName: string;
    conversionToBase: string;
    sellingPrice: string;
    barcode: string | null;
    isBaseUnit: boolean;
  }>;
};

type CartItem = {
  key: string;
  productId: string;
  productUnitId: string;
  productName: string;
  productCode: string;
  unitName: string;
  quantity: string;
  unitPrice: string;
  conversionToBase: string;
  baseUnitName: string;
  availableStock: string;
};

type PosPaymentMethod = {
  id: string;
  code: string;
  name: string;
  type: "CASH" | "QRIS" | "TRANSFER" | "DEBIT_CARD" | "OTHER";
};

type PaymentItem = {
  key: string;
  paymentMethodId: string;
  amount: string;
  referenceNumber: string;
};

type ProductSelectorProps = {
  products: PosProduct[];
  paymentMethods: PosPaymentMethod[];
};

function isValidQuantity(value: string) {
  return /^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/.test(value) && !/^0(?:\.0+)?$/.test(value);
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidMoney(value: string) {
  return /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(value) && toNumber(value) > 0;
}

function getBaseQuantity(quantity: string, conversionToBase: string) {
  return toNumber(quantity) * toNumber(conversionToBase);
}

function exceedsStock(quantity: string, conversionToBase: string, availableStock: string) {
  return getBaseQuantity(quantity, conversionToBase) > toNumber(availableStock) + 0.000_001;
}

export function ProductSelector({ products, paymentMethods }: ProductSelectorProps) {
  const initialState: PosCheckoutActionState = {};
  const [state, formAction, pending] = useActionState(
    createPosSaleAction,
    initialState,
  );
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>(() => [
    {
      key: crypto.randomUUID(),
      paymentMethodId: paymentMethods[0]?.id ?? "",
      amount: "",
      referenceNumber: "",
    },
  ]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  useEffect(() => {
    if (!checkoutVisible) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [checkoutVisible]);

  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const filteredProducts = useMemo(
    () => products.filter((product) => {
      if (!normalizedQuery) return true;
      return [
        product.name,
        product.productCode,
        product.barcode ?? "",
        ...product.units.map((unit) => unit.barcode ?? ""),
      ].some((value) => value.toLocaleLowerCase("id-ID").includes(normalizedQuery));
    }),
    [normalizedQuery, products],
  );
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const selectedUnit = selectedProduct?.units.find((unit) => unit.id === selectedUnitId) ?? null;
  const selectionIsValid = Boolean(selectedProduct && selectedUnit && isValidQuantity(quantity));
  const selectionSubtotal = selectionIsValid && selectedUnit
    ? calculateLineSubtotal(quantity, selectedUnit.sellingPrice)
    : "0";
  const cartSubtotal = calculateCartSubtotal(cart);
  const grandTotal = Math.max(toNumber(cartSubtotal) - toNumber(discountAmount || "0"), 0).toFixed(2).replace(/\.00$/, "");

  function getPaymentMethodType(paymentMethodId: string) {
    return paymentMethods.find((method) => method.id === paymentMethodId)?.type ?? "OTHER";
  }

  function getEffectivePaymentAmount(payment: PaymentItem) {
    return payments.length > 1 || getPaymentMethodType(payment.paymentMethodId) === "CASH"
      ? payment.amount || grandTotal
      : grandTotal;
  }

  const effectivePayments = payments.map((payment) => ({
    ...payment,
    amount: getEffectivePaymentAmount(payment),
  }));
  const paymentTotal = effectivePayments.reduce((total, payment) => total + toNumber(payment.amount), 0);
  const remainingPayment = toNumber(grandTotal) - paymentTotal;
  const changeAmount = Math.max(paymentTotal - toNumber(grandTotal), 0);
  const cashPaymentTotal = effectivePayments.reduce((total, payment) => {
    const method = paymentMethods.find((candidate) => candidate.id === payment.paymentMethodId);
    return method?.type === "CASH" ? total + toNumber(payment.amount) : total;
  }, 0);
  const cartHasStockIssue = cart.some((item) =>
    exceedsStock(item.quantity, item.conversionToBase, item.availableStock),
  );
  const checkoutIsValid =
    cart.length > 0 &&
    !cartHasStockIssue &&
    /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(discountAmount || "0") &&
    toNumber(discountAmount || "0") <= toNumber(cartSubtotal) &&
    effectivePayments.length > 0 &&
    effectivePayments.every((payment) => payment.paymentMethodId && isValidMoney(payment.amount)) &&
    remainingPayment <= 0.005 &&
    changeAmount <= cashPaymentTotal + 0.005;
  const checkoutItemsValue = JSON.stringify(
    cart.map((item) => ({
      productId: item.productId,
      productUnitId: item.productUnitId,
      quantity: item.quantity,
    })),
  );
  const checkoutPaymentsValue = JSON.stringify(
    effectivePayments.map((payment) => ({
      paymentMethodId: payment.paymentMethodId,
      amount: payment.amount,
      referenceNumber: payment.referenceNumber,
    })),
  );
  const checkoutBlockingMessage = (() => {
    if (!cart.length) return "Tambahkan produk ke keranjang terlebih dahulu.";
    if (cartHasStockIssue) return "Ada item yang melebihi stok tersedia.";
    if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(discountAmount || "0")) return "Nominal diskon tidak valid.";
    if (toNumber(discountAmount || "0") > toNumber(cartSubtotal)) return "Diskon tidak boleh melebihi subtotal.";
    if (!paymentMethods.length) return "Metode pembayaran aktif belum tersedia.";
    if (!effectivePayments.length) return "Tambahkan minimal satu pembayaran.";
    if (effectivePayments.some((payment) => !payment.paymentMethodId)) return "Pilih metode pembayaran.";
    if (effectivePayments.some((payment) => !isValidMoney(payment.amount))) return "Nominal pembayaran harus lebih besar dari 0.";
    if (remainingPayment > 0.005) {
      return `Pembayaran kurang ${formatIdrDecimal(remainingPayment.toFixed(2))}.`;
    }
    if (changeAmount > cashPaymentTotal + 0.005) {
      return "Kembalian hanya bisa dihitung dari pembayaran tunai.";
    }
    return null;
  })();

  function selectProduct(product: PosProduct) {
    setSelectedProductId(product.id);
    setSelectedUnitId(product.units[0]?.id ?? "");
    setQuantity("1");
    setMessage(null);
  }

  function addToCart() {
    if (!selectedProduct || !selectedUnit || !isValidQuantity(quantity)) {
      setMessage("Pilih Produk, Satuan, dan jumlah yang valid.");
      return;
    }

    const key = `${selectedProduct.id}:${selectedUnit.id}`;
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      const nextQuantity = existing ? addDecimalValues([existing.quantity, quantity]) : quantity;
      if (exceedsStock(nextQuantity, selectedUnit.conversionToBase, selectedProduct.currentStock)) {
        setMessage(`Stok ${selectedProduct.name} tidak mencukupi.`);
        return current;
      }
      if (existing) {
        return current.map((item) =>
          item.key === key
            ? { ...item, quantity: nextQuantity }
            : item,
        );
      }
      return [
        ...current,
        {
          key,
          productId: selectedProduct.id,
          productUnitId: selectedUnit.id,
          productName: selectedProduct.name,
          productCode: selectedProduct.productCode,
          unitName: selectedUnit.unitName,
          quantity,
          unitPrice: selectedUnit.sellingPrice,
          conversionToBase: selectedUnit.conversionToBase,
          baseUnitName: selectedProduct.baseUnitName,
          availableStock: selectedProduct.currentStock,
        },
      ];
    });
    setMessage(`${selectedProduct.name} (${selectedUnit.unitName}) ditambahkan ke keranjang.`);
  }

  function showCheckout() {
    if (!cart.length) {
      setMessage("Tambahkan item ke keranjang sebelum lanjut pembayaran.");
      return;
    }

    setCheckoutVisible(true);
    setMessage(null);
  }

  function updateQuantity(key: string, nextQuantity: string) {
    if (!isValidQuantity(nextQuantity)) return;
    const item = cart.find((candidate) => candidate.key === key);
    if (item && exceedsStock(nextQuantity, item.conversionToBase, item.availableStock)) {
      setMessage(`Stok ${item.productName} tidak mencukupi.`);
      return;
    }
    setCart((current) => current.map((item) =>
      item.key === key ? { ...item, quantity: nextQuantity } : item,
    ));
    setMessage(null);
  }

  function voidItem(key: string) {
    const item = cart.find((candidate) => candidate.key === key);
    setCart((current) => current.filter((candidate) => candidate.key !== key));
    setMessage(item ? `${item.productName} dihapus dari keranjang.` : null);
  }

  function clearCart() {
    if (!window.confirm("Kosongkan seluruh keranjang?")) return;
    setCart([]);
    setMessage("Keranjang dikosongkan.");
  }

  function addPayment() {
    setPayments((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        paymentMethodId: paymentMethods[0]?.id ?? "",
        amount: remainingPayment > 0 ? remainingPayment.toFixed(2).replace(/\.00$/, "") : "0",
        referenceNumber: "",
      },
    ]);
  }

  function updatePayment(key: string, patch: Partial<Omit<PaymentItem, "key">>) {
    setPayments((current) => current.map((payment) =>
      payment.key === key ? { ...payment, ...patch } : payment,
    ));
  }

  function removePayment(key: string) {
    setPayments((current) => current.length === 1 ? current : current.filter((payment) => payment.key !== key));
  }

  function fillRemainingPayment(key: string) {
    const otherTotal = effectivePayments
      .filter((payment) => payment.key !== key)
      .reduce((total, payment) => total + toNumber(payment.amount), 0);
    const nextAmount = Math.max(toNumber(grandTotal) - otherTotal, 0);
    updatePayment(key, { amount: nextAmount.toFixed(2).replace(/\.00$/, "") });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
      <section className="space-y-4">
        <label className="relative block">
          <span className="sr-only">Cari produk</span>
          <Search className="pointer-events-none absolute left-3 top-3 text-muted-foreground" size={18} aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, kode, atau barcode..." autoFocus className="h-11 w-full rounded-lg border bg-card pl-10 pr-3 text-sm focus:ring-2 focus:ring-primary/25" />
        </label>
        <p className="text-xs text-muted-foreground">{filteredProducts.length} dari {products.length} Produk</p>
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const isSelected = product.id === selectedProductId;
            return (
              <button key={product.id} type="button" onClick={() => selectProduct(product)} className={`flex min-h-28 gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary/50 ${isSelected ? "border-primary ring-2 ring-primary/15" : ""}`}>
                <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {product.imageUrl ? <Image src={product.imageUrl} alt="" fill sizes="64px" className="object-cover" placeholder="blur" blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL} /> : <span className="grid size-full place-items-center text-sm font-bold text-muted-foreground">TJ</span>}
                </span>
                <span className="min-w-0"><span className="line-clamp-2 font-semibold">{product.name}</span><span className="mt-1 block text-xs text-muted-foreground">{product.productCode}</span><span className="mt-2 block text-xs font-medium text-primary">Stok {formatIdDecimal(product.currentStock)} {product.baseUnitName}</span></span>
              </button>
            );
          })}
          {!filteredProducts.length && <p className="col-span-full rounded-xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">Produk tidak ditemukan.</p>}
        </div>
      </section>

      <aside className="h-fit space-y-4 xl:sticky xl:top-6">
        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ShoppingBasket size={19} aria-hidden="true" /></span>
            <div><p className="text-xs font-medium text-muted-foreground">Item terpilih</p><h2 className="font-semibold">Atur Satuan dan jumlah</h2></div>
          </div>
          {selectedProduct ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg bg-muted/50 p-3"><p className="font-semibold">{selectedProduct.name}</p><p className="mt-1 text-xs text-muted-foreground">{selectedProduct.category?.name ?? "Tanpa kategori"} · {selectedProduct.productCode}</p></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="block"><span className="mb-2 block text-sm font-medium">Satuan</span><select value={selectedUnitId} onChange={(event) => setSelectedUnitId(event.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm">{selectedProduct.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitName} — {formatIdrDecimal(unit.sellingPrice)}</option>)}</select></label>
                <label className="block"><span className="mb-2 block text-sm font-medium">Jumlah</span><input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-11 w-full rounded-md border bg-background px-3 text-sm" /></label>
              </div>
              {selectedUnit && <div className="flex justify-between rounded-lg border p-3 text-sm"><span className="text-muted-foreground">Subtotal</span><strong className="text-primary">{formatIdrDecimal(selectionSubtotal)}</strong></div>}
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <button type="button" onClick={addToCart} disabled={!selectionIsValid} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                  <Plus size={16} aria-hidden="true" />
                  Tambah ke keranjang
                </button>
                <button type="button" onClick={showCheckout} disabled={!cart.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
                  <Banknote size={16} aria-hidden="true" />
                  Lanjutkan pembayaran
                </button>
              </div>
            </div>
          ) : <p className="mt-6 rounded-lg bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">Pilih Produk untuk mulai mengisi keranjang.</p>}
        </section>

      </aside>

      {checkoutVisible && typeof document !== "undefined" ? createPortal((
        <div className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-black/55 px-3 py-6 backdrop-blur-sm sm:px-6">
        <form action={formAction} className="relative flex max-h-[calc(100dvh-3rem)] w-full max-w-[720px] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
          <input type="hidden" name="items" value={checkoutItemsValue} />
          <input type="hidden" name="payments" value={checkoutPaymentsValue} />
          <input type="hidden" name="discountAmount" value={discountAmount || "0"} />
          <input type="hidden" name="notes" value={notes} />
          <div className="shrink-0 border-b bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-medium text-muted-foreground">Keranjang sementara</p><h2 className="font-semibold">{cart.length} jenis item</h2></div>
            <div className="flex items-center gap-2">
              {cart.length > 0 && <button type="button" onClick={clearCart} className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"><X size={14} aria-hidden="true" /> Kosongkan</button>}
              <button type="button" onClick={() => setCheckoutVisible(false)} aria-label="Tutup keranjang sementara" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          {state.message && <p role="alert" className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{state.message}</p>}
          {message && <p aria-live="polite" className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">{message}</p>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mt-4 space-y-3">
            {cart.map((item) => (
              <article key={item.key} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-semibold">{item.productName}</p><p className="mt-1 text-xs text-muted-foreground">{item.productCode} · {item.unitName} @ {formatIdrDecimal(item.unitPrice)}</p></div>
                  <button type="button" onClick={() => voidItem(item.key)} aria-label={`Void ${item.productName} satuan ${item.unitName}`} className="grid size-8 shrink-0 place-items-center rounded-md text-rose-600 hover:bg-rose-50"><Trash2 size={16} aria-hidden="true" /></button>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Jumlah</span><input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateQuantity(item.key, event.target.value)} className="h-9 w-28 rounded-md border bg-background px-2 text-sm" /></label>
                  <p className="text-sm font-bold">{formatIdrDecimal(calculateLineSubtotal(item.quantity, item.unitPrice))}</p>
                </div>
                {exceedsStock(item.quantity, item.conversionToBase, item.availableStock) && (
                  <p className="mt-2 text-xs text-rose-600">
                    Melebihi stok tersedia {formatIdDecimal(item.availableStock)} {item.baseUnitName}.
                  </p>
                )}
              </article>
            ))}
            {!cart.length && <p className="rounded-lg bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">Keranjang masih kosong.</p>}
          </div>
          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="flex items-center justify-between"><span className="font-semibold">Subtotal</span><strong className="text-lg text-primary">{formatIdrDecimal(cartSubtotal)}</strong></div>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Diskon transaksi</span>
              <CurrencyInput value={discountAmount} onValueChange={setDiscountAmount} required className="h-9 w-full rounded-md border bg-background px-2 text-sm" />
            </label>
            <div className="flex items-center justify-between"><span className="font-semibold">Total</span><strong className="text-lg text-primary">{formatIdrDecimal(grandTotal)}</strong></div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Pembayaran</h3>
              <button type="button" onClick={addPayment} disabled={!paymentMethods.length} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Plus size={14} aria-hidden="true" /> Tambah
              </button>
            </div>
            {payments.map((payment) => {
              const paymentMethodType = getPaymentMethodType(payment.paymentMethodId);
              const paymentIsCash = paymentMethodType === "CASH";
              const paymentAmountIsEditable = payments.length > 1 || paymentIsCash;

              return (
                <div key={payment.key} className="rounded-lg border p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                    <select
                      value={payment.paymentMethodId}
                      onChange={(event) => {
                        const nextPaymentMethodId = event.target.value;
                        const nextPaymentMethodType = getPaymentMethodType(nextPaymentMethodId);
                        updatePayment(payment.key, {
                          paymentMethodId: nextPaymentMethodId,
                          amount: payments.length > 1 || nextPaymentMethodType === "CASH" ? payment.amount : "",
                        });
                      }}
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>{method.name}</option>
                      ))}
                    </select>
                    <CurrencyInput
                      value={paymentAmountIsEditable ? payment.amount || grandTotal : grandTotal}
                      onValueChange={(value) => updatePayment(payment.key, { amount: value })}
                      readOnly={!paymentAmountIsEditable}
                      required
                      className={`h-9 rounded-md border bg-background px-2 text-sm ${paymentAmountIsEditable ? "" : "cursor-not-allowed bg-muted/45 text-muted-foreground"}`}
                    />
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <input value={payment.referenceNumber} onChange={(event) => updatePayment(payment.key, { referenceNumber: event.target.value })} maxLength={100} placeholder="Referensi QRIS/transfer (opsional)" className="h-9 rounded-md border bg-background px-2 text-sm" />
                    <button type="button" onClick={() => fillRemainingPayment(payment.key)} disabled={!paymentAmountIsEditable} className="h-9 rounded-md border px-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Sisa</button>
                    <button type="button" onClick={() => removePayment(payment.key)} disabled={payments.length === 1} className="h-9 rounded-md border px-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40">Hapus</button>
                  </div>
                </div>
              );
            })}
            <div className={`rounded-lg px-3 py-2 text-xs ${remainingPayment <= 0.005 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
              {remainingPayment <= 0.005
                ? changeAmount > 0.005
                  ? `Kembalian ${formatIdrDecimal(changeAmount.toFixed(2))}.`
                  : "Pembayaran sudah pas."
                : remainingPayment > 0
                  ? `Sisa pembayaran ${formatIdrDecimal(remainingPayment.toFixed(2))}.`
                  : "Pembayaran sudah cukup."}
            </div>
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs text-muted-foreground">Catatan struk</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1_000} rows={2} className="w-full rounded-md border bg-background px-2 py-2 text-sm" />
          </label>
          {checkoutBlockingMessage && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
              {checkoutBlockingMessage}
            </p>
          )}
          </div>
          <div className="shrink-0 border-t bg-card p-5">
          <button
            type="submit"
            disabled={pending || !checkoutIsValid}
            title={checkoutBlockingMessage ?? undefined}
            className="mt-4 h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Menyimpan..." : "Simpan dan cetak struk"}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Void hanya menghapus item dari keranjang sementara sebelum transaksi disimpan.</p>
          </div>
        </form>
        </div>
      ), document.body) : null}
    </div>
  );
}
