import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "./lib/session";

// Public paths that never require a session.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/keys/validate"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = await verifySessionCookieValue(cookie);

  if (!valid) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
