import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup"];
const AUTH_PATHS = ["/login", "/signup"];
const SESSION_COOKIE = "outbid_session";

// API routes that don't require authentication
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/listings",
  "/api/rankings",
  "/api/webhooks",
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // Authenticated users shouldn't visit login/signup
  if (hasSession && AUTH_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Public pages
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/listings")
  ) {
    return NextResponse.next();
  }

  // Public API routes
  if (isPublicApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Protected API routes — return 401 instead of redirect
  if (pathname.startsWith("/api/") && !hasSession) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Protected pages — redirect to login
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
