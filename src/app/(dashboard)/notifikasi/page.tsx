import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Check } from "lucide-react";

import { markAllNotificationsReadAction, markNotificationReadAction } from "@/server/actions/notifications";
import { listNotificationsForCurrentUser } from "@/server/services/notifications";

export const metadata: Metadata = { title: "Notifikasi | Telur Jagoan" };

const notificationLabels: Record<string, string> = {
  LOW_STOCK: "Stok rendah",
  OUT_OF_STOCK: "Stok habis",
  BATCH_NEAR_EXPIRY: "Batch kedaluwarsa",
  SUPPLIER_DEBT_DUE: "Hutang supplier",
  CASH_DIFFERENCE: "Selisih kas",
  RETURN_PENDING_APPROVAL: "Retur",
};

export default async function NotificationsPage() {
  const notifications = await listNotificationsForCurrentUser();
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="mx-auto max-w-[1100px] animate-rise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Notifikasi</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pusat Notifikasi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pantau hutang jatuh tempo, stok, retur, dan selisih kas.
          </p>
        </div>
        <form action={markAllNotificationsReadAction}>
          <button
            type="submit"
            disabled={unreadCount === 0}
            className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            <Check size={16} aria-hidden="true" />
            Tandai semua dibaca
          </button>
        </form>
      </header>

      <section className="overflow-hidden rounded-xl border bg-card">
        {notifications.map((notification) => (
          <article key={notification.id} className="grid gap-4 border-b p-5 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center">
            <Link href={notification.href} className="flex min-w-0 gap-3 hover:opacity-85">
              <span className={`mt-1 grid size-10 shrink-0 place-items-center rounded-lg ${notification.isRead ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                <Bell size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{notification.title}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {notificationLabels[notification.type] ?? notification.type}
                  </span>
                  {!notification.isRead && (
                    <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">
                      Baru
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">{notification.message}</span>
                <span className="mt-2 block text-xs font-medium text-muted-foreground">{notification.createdAtLabel}</span>
              </span>
            </Link>
            {!notification.isRead && (
              <form action={markNotificationReadAction}>
                <input type="hidden" name="notificationId" value={notification.id} />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium hover:bg-muted"
                >
                  <Check size={14} aria-hidden="true" />
                  Tandai dibaca
                </button>
              </form>
            )}
          </article>
        ))}
        {!notifications.length && (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Bell size={20} aria-hidden="true" />
            </span>
            <p className="mt-4 font-semibold">Belum ada notifikasi</p>
            <p className="mt-1 text-sm text-muted-foreground">Notifikasi operasional akan muncul di sini.</p>
          </div>
        )}
      </section>
    </div>
  );
}
