import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { verifyPassword } from "@/lib/auth/password";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

function clientIp(request: NextRequest): string {
  // За reverse-proxy Timeweb (DEPLOYMENT.md) — первый адрес в X-Forwarded-For.
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Некорректные данные входа");
    }
    const { username, password } = parsed.data;

    const rateLimitKey = `${clientIp(request)}:${username.toLowerCase()}`;
    if (!checkLoginRateLimit(rateLimitKey)) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        "Слишком много попыток входа. Попробуйте позже.",
      );
    }

    const adminUser = await prisma.adminUser.findUnique({ where: { username } });

    // Единое сообщение независимо от того, что именно неверно — логин или
    // пароль, или пользователь деактивирован (раздел 20 ТЗ, fail closed).
    if (!adminUser || !adminUser.active) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Неверный логин или пароль");
    }

    const passwordValid = await verifyPassword(adminUser.passwordHash, password);
    if (!passwordValid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Неверный логин или пароль");
    }

    await createSession(adminUser.id);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
