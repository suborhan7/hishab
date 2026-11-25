/**
 * Redirects anyone without a valid session cookie to /login.
 * (Server actions and API routes also check the session themselves.)
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const ok = await isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the login page, Next internals and public PWA files.
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
