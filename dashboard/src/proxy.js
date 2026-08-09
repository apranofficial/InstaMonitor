import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Routes that stay public: the shared registration form (page + API)
// and the login flow itself. Everything else requires a session.
const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/register"];

function isPublic(pathname) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export default async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionToken(token);

  if (valid) {
    return NextResponse.next();
  }

  // API calls get a 401; page navigations redirect to the login page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("from", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|placeholder.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)).*)",
  ],
};
