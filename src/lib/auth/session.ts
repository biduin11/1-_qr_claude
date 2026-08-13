import "server-only";

import type { AdminUser } from "@prisma/client";
import { cookies } from "next/headers";

import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "admin_session";

// Внутренний инструмент на 1-2 учётные записи — 7 дней без rolling-продления
// осознанный компромисс простоты для V1 (ARCHITECTURE.md §8).
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

/** Создаёt DB-backed сессию (ARCHITECTURE.md §8) и ставит httpOnly cookie. */
export async function createSession(adminUserId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await prisma.adminSession.create({
    data: { adminUserId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.id, cookieOptions(expiresAt));
}

/**
 * Возвращает активного администратора для текущей сессии или null.
 * Проверяет: cookie присутствует, сессия существует и не истекла,
 * связанный AdminUser активен. Любое несоответствие — null (fail closed).
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const session = await prisma.adminSession.findUnique({
    where: { id: token },
    include: { adminUser: true },
  });

  if (!session || session.expiresAt < new Date() || !session.adminUser.active) {
    return null;
  }

  return session.adminUser;
}

/** Для API-роутов: возвращает администратора или бросает ApiError(401). */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new ApiError(401, "UNAUTHORIZED", "Требуется вход в систему");
  }
  return admin;
}

/** Удаляет текущую сессию из БД и очищает cookie. Идемпотентно. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.adminSession.deleteMany({ where: { id: token } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
