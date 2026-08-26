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
  "/api/stats",
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

const VISITOR_COOKIE = "outbid_visited";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // Authenticated users shouldn't visit login/signup
  if (hasSession && AUTH_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  // Public pages
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/listings")
  ) {
    // Track unique visitors on public pages
    if (!request.cookies.has(VISITOR_COOKIE)) {
      const response = NextResponse.next();
      response.cookies.set(VISITOR_COOKIE, "1", {
        maxAge: 60 * 60 * 24, // 24 hours
        httpOnly: true,
        sameSite: "lax",
      });
      // Fire-and-forget visitor increment
      const statsUrl = new URL("/api/stats", request.url);
      fetch(statsUrl, { method: "POST" }).catch(() => {});
      return response;
    }
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
