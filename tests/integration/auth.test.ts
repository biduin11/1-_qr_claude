/**
 * Интеграционный тест сессий администратора (ARCHITECTURE.md §8).
 * Требует реальный Postgres — см. заголовок tests/integration/env-guard.test.ts
 * за инструкцией запуска (тот же DATABASE_URL, тот же npm run test:integration).
 *
 * Мокается только "next/headers" (нужен request-scoped AsyncLocalStorage,
 * которого нет вне реального Next.js request-цикла) и "server-only" (пакет
 * намеренно бросает исключение вне React Server Component контекста) —
 * вся остальная логика (Prisma, src/lib/auth/session.ts) реальная, не мокается.
 */
import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: new Map<string, string>(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

const { ApiError } = await import("@/lib/api-error");
const { createSession, destroySession, getCurrentAdmin, requireAdmin } = await import(
  "@/lib/auth/session"
);

const prisma = new PrismaClient();

describe("session (интеграционный, требует реальный Postgres)", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL не задан — см. заголовок файла.");
    }
  });

  beforeEach(async () => {
    cookieStore.clear();
    await prisma.adminSession.deleteMany();
    await prisma.adminUser.deleteMany();
  });

  afterAll(async () => {
    await prisma.adminSession.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.$disconnect();
  });

  afterEach(() => {
    cookieStore.clear();
  });

  it("createSession + getCurrentAdmin возвращает того же администратора", async () => {
    const admin = await prisma.adminUser.create({
      data: { username: "tester", passwordHash: "irrelevant-for-this-test" },
    });

    await createSession(admin.id);
    const current = await getCurrentAdmin();

    expect(current?.id).toBe(admin.id);
    expect(cookieStore.get("admin_session")).toBeDefined();
  });

  it("getCurrentAdmin возвращает null без cookie", async () => {
    await expect(getCurrentAdmin()).resolves.toBeNull();
  });

  it("getCurrentAdmin возвращает null для истёкшей сессии", async () => {
    const admin = await prisma.adminUser.create({
      data: { username: "tester", passwordHash: "irrelevant" },
    });
    const session = await prisma.adminSession.create({
      data: { adminUserId: admin.id, expiresAt: new Date(Date.now() - 1000) },
    });
    cookieStore.set("admin_session", session.id);

    await expect(getCurrentAdmin()).resolves.toBeNull();
  });

  it("getCurrentAdmin возвращает null для деактивированного администратора", async () => {
    const admin = await prisma.adminUser.create({
      data: { username: "tester", passwordHash: "irrelevant", active: false },
    });
    const session = await prisma.adminSession.create({
      data: { adminUserId: admin.id, expiresAt: new Date(Date.now() + 60_000) },
    });
    cookieStore.set("admin_session", session.id);

    await expect(getCurrentAdmin()).resolves.toBeNull();
  });

  it("destroySession удаляет сессию из БД и cookie", async () => {
    const admin = await prisma.adminUser.create({
      data: { username: "tester", passwordHash: "irrelevant" },
    });
    await createSession(admin.id);
    expect(await prisma.adminSession.count()).toBe(1);

    await destroySession();

    expect(await prisma.adminSession.count()).toBe(0);
    expect(cookieStore.get("admin_session")).toBeUndefined();
    await expect(getCurrentAdmin()).resolves.toBeNull();
  });

  it("requireAdmin бросает ApiError(401) без валидной сессии", async () => {
    await expect(requireAdmin()).rejects.toBeInstanceOf(ApiError);
  });

  it("requireAdmin возвращает администратора при валидной сессии", async () => {
    const admin = await prisma.adminUser.create({
      data: { username: "tester", passwordHash: "irrelevant" },
    });
    await createSession(admin.id);

    await expect(requireAdmin()).resolves.toMatchObject({ id: admin.id });
  });
});
