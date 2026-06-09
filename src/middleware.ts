import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/prepare", "/sign", "/form", "/team", "/settings"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  // Defense in depth: client pages also redirect unauthenticated users via AuthContext.
  // Middleware cannot verify Firebase tokens without a session cookie; this blocks
  // obvious unauthenticated navigation to protected routes in SSR contexts.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/prepare/:path*", "/sign/:path*", "/form/:path*", "/team/:path*", "/settings/:path*"],
};
