import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SessionActivity } from "@/features/auth/session-activity";
import { auth } from "@/lib/auth";
import { isAppRole } from "@/lib/permissions";
import { getTopbarNotificationsForCurrentUser, getUnreadNotificationCountForCurrentUser } from "@/server/services/notifications";
import { synchronizeSupplierDebtDueNotifications } from "@/server/services/purchases";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || !isAppRole(session.user.role)) {
    redirect("/login");
  }

  if (session.user.role === "OWNER") {
    await synchronizeSupplierDebtDueNotifications();
  }
  const [notificationCount, notifications] = await Promise.all([
    getUnreadNotificationCountForCurrentUser(),
    getTopbarNotificationsForCurrentUser(),
  ]);

  return (
    <>
      <SessionActivity />
      <DashboardShell
        user={{
          name: session.user.name ?? "Pengguna Telur Jagoan",
          email: session.user.email ?? "-",
          role: session.user.role,
        }}
        notificationCount={notificationCount}
        notifications={notifications}
      >
        {children}
      </DashboardShell>
    </>
  );
}
