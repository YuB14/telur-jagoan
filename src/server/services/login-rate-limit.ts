import "server-only";

import { createHmac } from "node:crypto";

import { db } from "@/lib/db";

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const LOGIN_FAILED = "LOGIN_FAILED";
const LOGIN_BLOCKED = "LOGIN_BLOCKED";
const LOGIN_LOCKED = "LOGIN_LOCKED";
const LOGIN_SUCCESS = "LOGIN_SUCCESS";
const LOGIN_UNLOCKED = "LOGIN_UNLOCKED";

type LoginAttemptContext = {
  identifier: string;
  userId: string | null;
  request: Request;
};

type LoginMetadata = {
  accountHash: string;
  ipAddress: string;
  userAgent: string | null;
};

function getAccountHash(identifier: string) {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET belum dikonfigurasi.");
  }

  return createHmac("sha256", secret)
    .update(identifier.trim().toLocaleLowerCase("id-ID"))
    .digest("hex");
}

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const candidate = forwardedFor?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")?.trim()
    ?? "unknown";

  return candidate.slice(0, 64);
}

function getLoginMetadata(context: LoginAttemptContext): LoginMetadata {
  return {
    accountHash: getAccountHash(context.identifier),
    ipAddress: getRequestIp(context.request),
    userAgent: context.request.headers.get("user-agent"),
  };
}

function accountHashFilter(accountHash: string) {
  return {
    path: ["accountHash"],
    equals: accountHash,
  } as const;
}

function scopeFilter(scope: "ACCOUNT" | "IP") {
  return {
    path: ["scope"],
    equals: scope,
  } as const;
}

export async function isLoginBlocked(context: LoginAttemptContext) {
  const metadata = getLoginMetadata(context);
  const lockCutoff = new Date(Date.now() - LOCK_DURATION_MS);

  const [accountLock, accountUnlock, ipLock] = await Promise.all([
    db.activityLog.findFirst({
      where: {
        action: LOGIN_LOCKED,
        createdAt: { gte: lockCutoff },
        AND: [
          { newValues: scopeFilter("ACCOUNT") },
          { newValues: accountHashFilter(metadata.accountHash) },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.activityLog.findFirst({
      where: {
        action: LOGIN_UNLOCKED,
        AND: [
          { newValues: scopeFilter("ACCOUNT") },
          { newValues: accountHashFilter(metadata.accountHash) },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.activityLog.findFirst({
      where: {
        action: LOGIN_LOCKED,
        ipAddress: metadata.ipAddress,
        createdAt: { gte: lockCutoff },
        newValues: scopeFilter("IP"),
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const accountIsLocked = Boolean(
    accountLock && (!accountUnlock || accountUnlock.createdAt < accountLock.createdAt),
  );

  return accountIsLocked || Boolean(ipLock);
}

export async function recordFailedLogin(context: LoginAttemptContext) {
  const metadata = getLoginMetadata(context);
  const windowStart = new Date(Date.now() - ATTEMPT_WINDOW_MS);

  await db.activityLog.create({
    data: {
      userId: context.userId,
      action: LOGIN_FAILED,
      entityType: "AUTH",
      entityId: context.userId,
      newValues: { accountHash: metadata.accountHash },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  });

  const latestSuccess = await db.activityLog.findFirst({
    where: {
      action: LOGIN_SUCCESS,
      newValues: accountHashFilter(metadata.accountHash),
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const accountWindowStart = latestSuccess && latestSuccess.createdAt > windowStart
    ? latestSuccess.createdAt
    : windowStart;

  const [accountFailures, ipFailures] = await Promise.all([
    db.activityLog.count({
      where: {
        action: LOGIN_FAILED,
        createdAt: { gt: accountWindowStart },
        newValues: accountHashFilter(metadata.accountHash),
      },
    }),
    db.activityLog.count({
      where: {
        action: LOGIN_FAILED,
        ipAddress: metadata.ipAddress,
        createdAt: { gte: windowStart },
      },
    }),
  ]);

  const locks: Array<Promise<unknown>> = [];

  if (accountFailures >= MAX_FAILED_ATTEMPTS) {
    locks.push(createLockLog(context, metadata, "ACCOUNT"));
  }

  if (ipFailures >= MAX_FAILED_ATTEMPTS) {
    locks.push(createLockLog(context, metadata, "IP"));
  }

  await Promise.all(locks);
}

export async function recordBlockedLogin(context: LoginAttemptContext) {
  const metadata = getLoginMetadata(context);

  await db.activityLog.create({
    data: {
      userId: context.userId,
      action: LOGIN_BLOCKED,
      entityType: "AUTH",
      entityId: context.userId,
      newValues: { accountHash: metadata.accountHash },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  });
}

export async function recordSuccessfulLogin(context: LoginAttemptContext) {
  const metadata = getLoginMetadata(context);

  await db.activityLog.create({
    data: {
      userId: context.userId,
      action: LOGIN_SUCCESS,
      entityType: "AUTH",
      entityId: context.userId,
      newValues: { accountHash: metadata.accountHash },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  });
}

function createLockLog(
  context: LoginAttemptContext,
  metadata: LoginMetadata,
  scope: "ACCOUNT" | "IP",
) {
  return db.activityLog.create({
    data: {
      userId: context.userId,
      action: LOGIN_LOCKED,
      entityType: "AUTH",
      entityId: context.userId,
      newValues: { accountHash: metadata.accountHash, scope },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  });
}
