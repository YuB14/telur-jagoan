import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SupplierDebtPaymentForm } from "@/components/purchase/supplier-debt-payment-form";
import { getSupplierDebtPaymentData } from "@/server/services/purchases";
import { purchaseIdSchema } from "@/server/validations/purchase";

export const metadata: Metadata = { title: "Bayar Hutang Supplier | Telur Jagoan" };

function dateInput(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
}

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function PaySupplierDebtPage({ params }: PageProps<"/pembelian/[id]/bayar">) {
  const { id } = await params;
  const parsedId = purchaseIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const { purchase, paymentMethods } = await getSupplierDebtPaymentData(parsedId.data);
  if (!purchase || purchase.status !== "RECEIVED" || purchase.remainingDebt.lessThanOrEqualTo(0)) notFound();

  return (
    <div className="mx-auto max-w-[1100px] animate-rise space-y-6">
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Hutang Supplier</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Catat Pembayaran</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pembayaran tidak boleh melebihi sisa hutang terbaru.</p>
      </header>
      <SupplierDebtPaymentForm
        purchase={{
          ...purchase,
          purchaseDate: dateInput(purchase.purchaseDate) ?? "",
          dueDate: dateInput(purchase.dueDate),
          grandTotal: purchase.grandTotal.toString(),
          amountPaid: purchase.amountPaid.toString(),
          remainingDebt: purchase.remainingDebt.toString(),
          payments: purchase.payments.map((payment) => ({
            ...payment,
            paymentDate: dateInput(payment.paymentDate) ?? "",
            amount: payment.amount.toString(),
          })),
        }}
        paymentMethods={paymentMethods}
        defaultPaymentDate={jakartaToday()}
      />
    </div>
  );
}
