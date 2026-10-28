import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/privacidade",
  "/termos",
  "/solicitacao-de-dados",
  "/exclusao-de-dados",
  "/api/auth",
  "/api/health",
  "/api/webhooks/meta",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublic || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (!request.cookies.has("zyrva_session")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
