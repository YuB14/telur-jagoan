import "server-only";

import { auth } from "@/lib/auth";

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireOwner() {
  const session = await auth();

  if (!session?.user) {
    throw new AuthorizationError("Anda harus login untuk melanjutkan.");
  }

  if (session.user.role !== "OWNER") {
    throw new AuthorizationError("Hanya Owner yang dapat melakukan tindakan ini.");
  }

  return session.user;
}

export async function requireCashier() {
  const session = await auth();

  if (!session?.user) {
    throw new AuthorizationError("Anda harus login untuk melanjutkan.");
  }

  if (session.user.role !== "CASHIER") {
    throw new AuthorizationError("Hanya Kasir yang dapat membuka sesi kasir.");
  }

  return session.user;
}

export async function requireCashierOperator() {
  const session = await auth();

  if (!session?.user) {
    throw new AuthorizationError("Anda harus login untuk melanjutkan.");
  }

  if (session.user.role !== "CASHIER" && session.user.role !== "OWNER") {
    throw new AuthorizationError("Hanya Kasir atau Owner yang dapat mengoperasikan kasir.");
  }

  return session.user;
}
