"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isAppRole } from "@/lib/permissions";

async function getUser() {
  const session = await auth();
  const user = session?.user;
  if (!user || !isAppRole(user.role)) {
    throw new Error("Anda harus login untuk mengubah notifikasi.");
  }
  return user;
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await getUser();
  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) return;

  await db.notification.updateMany({
    where: {
      id: notificationId,
      OR: [
        { userId: user.id },
        ...(user.role === "OWNER" ? [{ userId: null }] : []),
      ],
    },
    data: { isRead: true },
  });

  revalidatePath("/notifikasi");
  revalidatePath("/");
}

export async function markAllNotificationsReadAction() {
  const user = await getUser();

  await db.notification.updateMany({
    where: {
      isRead: false,
      OR: [
        { userId: user.id },
        ...(user.role === "OWNER" ? [{ userId: null }] : []),
      ],
    },
    data: { isRead: true },
  });

  revalidatePath("/notifikasi");
  revalidatePath("/");
}
