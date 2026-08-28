"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Egg,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  X,
} from "lucide-react";

import { getNavigation } from "@/data/navigation";
import type { AppRole } from "@/lib/permissions";

type DashboardShellProps = {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role: AppRole;
  };
  notificationCount?: number;
  notifications?: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    href: string;
    isRead: boolean;
    createdAtLabel: string;
  }>;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TJ";
}

export function DashboardShell({ children, user, notificationCount = 0, notifications = [] }: DashboardShellProps) {
  const pathname = usePathname();
  const navigation = getNavigation(user.role);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const dismissedNotificationKey = `telur-jagoan-dismissed-notifications:${user.email}`;
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];

    const savedDismissedIds = window.localStorage.getItem(dismissedNotificationKey);
    if (!savedDismissedIds) return [];

    try {
      const parsedDismissedIds = JSON.parse(savedDismissedIds);
      return Array.isArray(parsedDismissedIds)
        ? parsedDismissedIds.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      window.localStorage.removeItem(dismissedNotificationKey);
      return [];
    }
  });
  const notificationRef = useRef<HTMLDivElement>(null);
  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !dismissedNotificationIds.includes(notification.id)),
    [dismissedNotificationIds, notifications],
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem("telur-jagoan-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const enabled = savedTheme === "dark" || (!savedTheme && prefersDark);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  useEffect(() => {
    if (!notificationOpen) return;

    function closeNotificationOnOutsidePointer(event: PointerEvent) {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeNotificationOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeNotificationOnOutsidePointer);
  }, [notificationOpen]);

  function toggleTheme() {
    const nextTheme = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextTheme);
    localStorage.setItem("telur-jagoan-theme", nextTheme ? "dark" : "light");
  }

  function dismissNotification(notificationId: string) {
    setDismissedNotificationIds((currentIds) => {
      const nextIds = Array.from(new Set([...currentIds, notificationId]));
      localStorage.setItem(dismissedNotificationKey, JSON.stringify(nextIds));
      return nextIds;
    });
  }

  const sidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center border-b px-3">
        <Link
          href={user.role === "OWNER" ? "/dashboard" : "/kasir"}
          onClick={() => setMobileOpen(false)}
          className="flex min-w-0 items-center gap-3 rounded-lg p-2"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Egg size={18} aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">Telur Jagoan</span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.role === "OWNER" ? "Dashboard Owner" : "Dashboard Kasir"}
              </span>
            </span>
          )}
        </Link>
      </div>

      <nav aria-label="Navigasi dashboard" className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((group) => (
          <div key={group.title} className="mb-5">
            {!collapsed && (
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`flex min-h-10 items-center gap-3 rounded-md text-sm transition-colors ${
                      collapsed ? "mx-auto size-10 justify-center px-0" : "px-2.5"
                    } ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon size={17} className="shrink-0" aria-hidden="true" />
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
            {getInitials(user.name)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              aria-label="Keluar dari akun"
              title="Keluar"
              onClick={() => signOut({ redirectTo: "/" })}
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar transition-[width,transform] duration-200 lg:translate-x-0 ${
          collapsed ? "w-[76px]" : "w-[280px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setMobileOpen(false)}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-md hover:bg-muted lg:hidden"
        >
          <X size={17} aria-hidden="true" />
        </button>
        {sidebarContent}
      </aside>

      <div className={`min-h-screen min-w-0 transition-[padding] duration-200 ${collapsed ? "lg:pl-[76px]" : "lg:pl-[280px]"}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-lg sm:px-6">
          <button
            type="button"
            aria-label="Buka menu"
            onClick={() => setMobileOpen(true)}
            className="grid size-9 place-items-center rounded-md hover:bg-muted lg:hidden"
          >
            <Menu size={19} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            onClick={() => setCollapsed((value) => !value)}
            className="hidden size-9 place-items-center rounded-md hover:bg-muted lg:grid"
          >
            {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-medium">{user.name}</span>
              <span className="block text-xs text-muted-foreground">
                {user.role === "OWNER" ? "Owner" : "Kasir"}
              </span>
            </span>
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                aria-label="Notifikasi"
                aria-expanded={notificationOpen}
                onClick={() => setNotificationOpen((value) => !value)}
                className="relative grid size-9 place-items-center rounded-full border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Bell size={17} aria-hidden="true" />
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>
              {notificationOpen && (
                <div className="absolute right-0 top-11 z-50 w-[min(calc(100vw-2rem),380px)] overflow-hidden rounded-lg border bg-card shadow-xl">
                  <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Notifikasi</p>
                      <p className="text-xs text-muted-foreground">{notificationCount} belum dibaca</p>
                    </div>
                    <Link href="/notifikasi" onClick={() => setNotificationOpen(false)} className="text-xs font-medium text-primary hover:underline">
                      Lihat semua
                    </Link>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto py-1">
                    {visibleNotifications.map((notification) => (
                      <div key={notification.id} className="flex border-b text-sm last:border-b-0 hover:bg-muted/55">
                        <Link
                          href={notification.href}
                          onClick={() => setNotificationOpen(false)}
                          className="block min-w-0 flex-1 px-4 py-3"
                        >
                          <span className="flex items-start gap-2">
                            <span
                              className={`mt-1 size-2 shrink-0 rounded-full ${
                                notification.isRead ? "bg-muted-foreground/35" : "bg-rose-600"
                              }`}
                              aria-hidden="true"
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{notification.title}</span>
                              <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                {notification.message}
                              </span>
                              <span className="mt-2 block text-[11px] font-medium uppercase text-muted-foreground">
                                {notification.createdAtLabel}
                              </span>
                            </span>
                          </span>
                        </Link>
                        <button
                          type="button"
                          aria-label={`Sembunyikan notifikasi ${notification.title}`}
                          title="Sembunyikan"
                          onClick={() => dismissNotification(notification.id)}
                          className="mr-2 mt-2 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X size={15} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    {!visibleNotifications.length && (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Belum ada notifikasi.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label="Ganti tema"
              onClick={toggleTheme}
              className="grid size-9 place-items-center rounded-full border bg-card hover:bg-muted"
            >
              <Moon size={16} className="dark:hidden" aria-hidden="true" />
              <Sun size={16} className="hidden dark:block" aria-hidden="true" />
            </button>
            <span className="grid size-9 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800" aria-hidden="true">
              {getInitials(user.name)}
            </span>
          </div>
        </header>
        <main className="min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
