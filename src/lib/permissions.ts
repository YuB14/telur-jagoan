export type AppRole = "OWNER" | "CASHIER";

const CASHIER_ROUTE_PREFIXES = ["/kasir", "/riwayat", "/penjualan"] as const;

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canAccessPath(role: AppRole, pathname: string) {
  if (role === "OWNER") {
    return true;
  }

  return CASHIER_ROUTE_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix));
}

export function getDefaultPathForRole(role: AppRole) {
  return role === "OWNER" ? "/produk" : "/kasir";
}

export function isAppRole(value: unknown): value is AppRole {
  return value === "OWNER" || value === "CASHIER";
}
