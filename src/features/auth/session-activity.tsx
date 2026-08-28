"use client";

import { getSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_REFRESH_INTERVAL_MS,
} from "@/lib/auth-constants";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

export function SessionActivity() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let idleTimer: ReturnType<typeof setTimeout>;
    let lastActivityAt = Date.now();
    let lastRefreshAt = 0;
    let refreshInFlight = false;
    let logoutInFlight = false;

    function redirectToLogin() {
      router.replace("/login");
      router.refresh();
    }

    async function logoutForInactivity() {
      if (logoutInFlight) {
        return;
      }

      logoutInFlight = true;

      try {
        await signOut({ redirect: false, redirectTo: "/login" });
      } catch {
        // Tetap arahkan ke login; cookie server akan ditolak setelah JWT kedaluwarsa.
      } finally {
        if (active) {
          redirectToLogin();
        }
      }
    }

    function scheduleIdleCheck() {
      clearTimeout(idleTimer);

      const elapsed = Date.now() - lastActivityAt;
      const remaining = Math.max(SESSION_IDLE_TIMEOUT_MS - elapsed, 0);

      idleTimer = setTimeout(() => {
        if (Date.now() - lastActivityAt >= SESSION_IDLE_TIMEOUT_MS) {
          void logoutForInactivity();
          return;
        }

        scheduleIdleCheck();
      }, remaining);
    }

    async function refreshSession(force = false) {
      const now = Date.now();

      if (
        refreshInFlight
        || (!force && now - lastRefreshAt < SESSION_REFRESH_INTERVAL_MS)
      ) {
        return;
      }

      refreshInFlight = true;

      try {
        const session = await getSession({ event: "activity", broadcast: false });
        lastRefreshAt = Date.now();

        if (!session) {
          await logoutForInactivity();
        }
      } catch {
        // Gangguan jaringan sementara tidak dianggap sebagai sesi kedaluwarsa.
        lastRefreshAt = 0;
      } finally {
        refreshInFlight = false;
      }
    }

    function handleActivity() {
      lastActivityAt = Date.now();
      scheduleIdleCheck();
      void refreshSession();
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (Date.now() - lastActivityAt >= SESSION_IDLE_TIMEOUT_MS) {
        void logoutForInactivity();
        return;
      }

      handleActivity();
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    scheduleIdleCheck();
    void refreshSession(true);

    return () => {
      active = false;
      clearTimeout(idleTimer);

      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
