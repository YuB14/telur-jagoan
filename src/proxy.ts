import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  canAccessPath,
  getDefaultPathForRole,
  isAppRole,
} from "@/lib/permissions";

function createLoginUrl(requestUrl: URL) {
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("callbackUrl", `${requestUrl.pathname}${requestUrl.search}`);

  return loginUrl;
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const role = request.auth?.user?.role;
  const isApiRequest = pathname.startsWith("/api/");
  const isLoggedIn = isAppRole(role);

  // Landing page (/) — bisa diakses semua orang.
  // Jika sudah login, arahkan ke dashboard.
  if (pathname === "/") {
    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(getDefaultPathForRole(role), request.nextUrl.origin),
      );
    }

    return NextResponse.next();
  }

  // Halaman login — jika sudah login, arahkan ke dashboard.
  if (pathname === "/login") {
    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(getDefaultPathForRole(role), request.nextUrl.origin),
      );
    }

    return NextResponse.next();
  }

  // Route lainnya — wajib login.
  if (!request.auth?.user || !isLoggedIn) {
    if (isApiRequest) {
      return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }

    return NextResponse.redirect(createLoginUrl(request.nextUrl));
  }

  // Cek akses berdasarkan role.
  if (!canAccessPath(role, pathname)) {
    if (isApiRequest) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    return NextResponse.redirect(
      new URL(getDefaultPathForRole(role), request.nextUrl.origin),
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
