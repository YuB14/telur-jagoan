import "server-only";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAppRole } from "@/lib/permissions";

function getNotificationHref(referenceType: string | null, referenceId: string | null) {
  if (referenceType === "PURCHASE" && referenceId) return `/pembelian/${referenceId}`;
  if (referenceType === "SALE" && referenceId) return `/penjualan/${referenceId}`;
  if (referenceType === "SALE_RETURN" || referenceType === "PURCHASE_RETURN") return "/penjualan";
  if (referenceType === "CASH_SESSION") return "/kasir/riwayat-sesi";
  if (referenceType === "INVENTORY_BATCH" || referenceType === "STOCK_DAMAGE") return "/stok/pergerakan";
  return "/notifikasi";
}

function formatNotificationTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function getCurrentNotificationUser() {
  const session = await auth();
  const user = session?.user;
  if (!user || !isAppRole(user.role)) return null;
  return user;
}

function getVisibilityWhere(user: NonNullable<Awaited<ReturnType<typeof getCurrentNotificationUser>>>) {
  return {
    OR: [
      { userId: user.id },
      ...(user.role === "OWNER" ? [{ userId: null }] : []),
    ],
  };
}

export async function getUnreadNotificationCountForCurrentUser() {
  const user = await getCurrentNotificationUser();
  if (!user) return 0;

  return db.notification.count({
    where: {
      isRead: false,
      ...getVisibilityWhere(user),
    },
  });
}

export async function getTopbarNotificationsForCurrentUser(limit = 6) {
  const user = await getCurrentNotificationUser();
  if (!user) return [];

  const notifications = await db.notification.findMany({
    where: getVisibilityWhere(user),
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      referenceType: true,
      referenceId: true,
      isRead: true,
      createdAt: true,
    },
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    href: getNotificationHref(notification.referenceType, notification.referenceId),
    isRead: notification.isRead,
    createdAtLabel: formatNotificationTime(notification.createdAt),
  }));
}

export async function listNotificationsForCurrentUser() {
  const user = await getCurrentNotificationUser();
  if (!user) return [];

  const notifications = await db.notification.findMany({
    where: getVisibilityWhere(user),
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      referenceType: true,
      referenceId: true,
      isRead: true,
      createdAt: true,
    },
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    href: getNotificationHref(notification.referenceType, notification.referenceId),
    isRead: notification.isRead,
    createdAtLabel: formatNotificationTime(notification.createdAt),
  }));
}
