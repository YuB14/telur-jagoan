import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardOverview } from "@/features/dashboard/dashboard-overview";
import { auth } from "@/lib/auth";
import { isAppRole } from "@/lib/permissions";
import { getOwnerDashboardData } from "@/server/services/dashboard";

export const metadata: Metadata = {
  title: "Dashboard | Telur Jagoan",
  description: "Ringkasan operasional dan performa bisnis Telur Jagoan",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user || !isAppRole(session.user.role)) {
    redirect("/login");
  }

  const { role, name } = session.user;

  if (role === "CASHIER") {
    return <DashboardOverview name={name ?? "Kasir"} role={role} />;
  }

  const ownerData = await getOwnerDashboardData();

  return (
    <DashboardOverview
      name={name ?? "Owner"}
      role={role}
      ownerData={ownerData}
    />
  );
}
