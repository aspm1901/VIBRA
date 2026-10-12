import { NextRequest, NextResponse } from "next/server";
import { signAdminToken, ADMIN_COOKIE_NAME } from "@/lib/auth";

// Rate limiting en memoria por IP (máx 5 intentos fallidos en 5 min)
const failedAttempts = new Map<string, { count: number; blockedUntil: number }>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "127.0.0.1";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const now = Date.now();

    const record = failedAttempts.get(ip);
    if (record && record.blockedUntil > now) {
      const waitSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return NextResponse.json(
        { error: `Demasiados intentos fallidos. Espera ${waitSeconds}s antes de reintentar.` },
        { status: 429 }
      );
    }

    const { pin } = await req.json();
    const serverPin = process.env.ADMIN_PIN || "123456";

    if (!pin || typeof pin !== "string" || pin.trim() !== serverPin.trim()) {
      const current = failedAttempts.get(ip) || { count: 0, blockedUntil: 0 };
      current.count += 1;
      if (current.count >= 5) {
        current.blockedUntil = now + 5 * 60 * 1000; // 5 minutos de bloqueo
        current.count = 0;
      }
      failedAttempts.set(ip, current);

      return NextResponse.json(
        { error: "PIN de administrador incorrecto." },
        { status: 401 }
      );
    }

    // Éxito: limpiar intentos
    failedAttempts.delete(ip);

    // Generar token firmado
    const token = await signAdminToken(8);

    const response = NextResponse.json({
      success: true,
      message: "Acceso concedido.",
    });

    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60, // 8 horas
    });

    return response;
  } catch (error) {
    console.error("Error en login admin:", error);
    return NextResponse.json(
      { error: "Error en el servidor al autenticar." },
      { status: 500 }
    );
  }
}
