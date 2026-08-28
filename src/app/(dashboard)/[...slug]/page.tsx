import { DashboardOverview } from "@/features/dashboard/dashboard-overview";
import { MenuContent } from "@/features/pages/menu-content";
import { auth } from "@/lib/auth";
import { isAppRole } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";

export default async function MenuPage({ params }: PageProps<"/[...slug]">) {
  const { slug } = await params;
  const path = slug.join("/");

  if (path === "login") {
    notFound();
  }

  const session = await auth();
  const user = await session?.user;

  if (!user || !isAppRole(user.role)) {
    redirect("/login");
  }

  const role = user.role;

  if (path === "supplier" || path.startsWith("supplier/")) {
    redirect("/pembelian");
  }

  if (path === "pelanggan" || path.startsWith("pelanggan/")) {
    redirect("/penjualan");
  }

  if (
    path === "keuangan/kategori-pengeluaran" ||
    path === "keuangan/saldo-kas" ||
    path === "keuangan/pergerakan-kas" ||
    path === "keuangan/rekonsiliasi"
  ) {
    redirect("/keuangan");
  }

  if (
    path === "pengaturan/profil-toko" ||
    path === "pengaturan/nomor-transaksi" ||
    path === "pengaturan/metode-pembayaran" ||
    path.startsWith("pengaturan/metode-pembayaran/") ||
    path === "pengaturan/stok"
  ) {
    redirect("/pengaturan/struk");
  }

  if (role === "CASHIER" && path === "kasir") {
    return (
      <DashboardOverview
        name={user.name ?? "Kasir"}
        role={role}
      />
    );
  }

  return <MenuContent path={path} role={role} />;
}
