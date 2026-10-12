import { NextRequest, NextResponse } from "next/server";
import { signAdminToken, verifyAdminToken, ADMIN_COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir la pantalla y api de login sin autenticación
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  // Rutas protegidas: /admin y /api/admin
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isValid = token ? await verifyAdminToken(token) : false;

    if (!isValid) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json(
          { error: "No autorizado. Sesión de administrador requerida." },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
