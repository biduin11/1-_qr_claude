/**
 * Интеграционный тест HTTP-обвязки /api/admin/login и /api/admin/logout —
 * не только "правильный пароль совпадает", а именно то, что реально отдаёт
 * маршрут: коды статуса, коды ошибок из API_CONTRACT.md, лимит попыток.
 * Требует реальный Postgres — см. заголовок env-guard.test.ts.
 */
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
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

const { POST: login } = await import("@/app/api/admin/login/route");
const { POST: logout } = await import("@/app/api/admin/logout/route");
const { hashPassword } = await import("@/lib/auth/password");
const { resetLoginRateLimit } = await import("@/lib/auth/rate-limit");

const prisma = new PrismaClient();

function loginRequest(body: unknown, ip = "203.0.113.5"): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/login и /api/admin/logout (интеграционный)", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL не задан — см. заголовок env-guard.test.ts.");
    }
  });

  beforeEach(async () => {
    cookieStore.clear();
    resetLoginRateLimit();
    await prisma.adminSession.deleteMany();
    await prisma.adminUser.deleteMany();
  });

  afterEach(() => {
    cookieStore.clear();
  });

  afterAll(async () => {
    await prisma.adminSession.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.$disconnect();
  });

  it("верные логин/пароль → 200, создаётся сессия", async () => {
    const passwordHash = await hashPassword("right-password-123");
    await prisma.adminUser.create({ data: { username: "tester", passwordHash } });

    const response = await login(loginRequest({ username: "tester", password: "right-password-123" }));

    expect(response.status).toBe(200);
    expect(cookieStore.get("admin_session")).toBeDefined();
    expect(await prisma.adminSession.count()).toBe(1);
  });

  it("неверный пароль → 401 INVALID_CREDENTIALS, сессия не создаётся", async () => {
    const passwordHash = await hashPassword("right-password-123");
    await prisma.adminUser.create({ data: { username: "tester", passwordHash } });

    const response = await login(loginRequest({ username: "tester", password: "wrong" }));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
    expect(cookieStore.get("admin_session")).toBeUndefined();
    expect(await prisma.adminSession.count()).toBe(0);
  });

  it("несуществующий логин → 401 INVALID_CREDENTIALS (то же сообщение, что и неверный пароль)", async () => {
    const response = await login(loginRequest({ username: "no-such-user", password: "whatever" }));
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("деактивированный администратор → 401 INVALID_CREDENTIALS", async () => {
    const passwordHash = await hashPassword("right-password-123");
    await prisma.adminUser.create({
      data: { username: "tester", passwordHash, active: false },
    });

    const response = await login(
      loginRequest({ username: "tester", password: "right-password-123" }),
    );

    expect(response.status).toBe(401);
    expect(await prisma.adminSession.count()).toBe(0);
  });

  it("отсутствующее поле → 400 VALIDATION_ERROR", async () => {
    const response = await login(loginRequest({ username: "tester" }));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("после 5 неверных попыток с одного IP+логина шестая — 429 RATE_LIMITED", async () => {
    const passwordHash = await hashPassword("right-password-123");
    await prisma.adminUser.create({ data: { username: "tester", passwordHash } });

    for (let i = 0; i < 5; i += 1) {
      const response = await login(
        loginRequest({ username: "tester", password: "wrong" }, "198.51.100.9"),
      );
      expect(response.status).toBe(401);
    }

    const sixth = await login(
      loginRequest({ username: "tester", password: "wrong" }, "198.51.100.9"),
    );
    const body = (await sixth.json()) as { error: { code: string } };

    expect(sixth.status).toBe(429);
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("лимит не срабатывает раньше времени для другого IP", async () => {
    const passwordHash = await hashPassword("right-password-123");
    await prisma.adminUser.create({ data: { username: "tester", passwordHash } });

    for (let i = 0; i < 5; i += 1) {
      await login(loginRequest({ username: "tester", password: "wrong" }, "198.51.100.10"));
    }

    const fromAnotherIp = await login(
      loginRequest({ username: "tester", password: "right-password-123" }, "198.51.100.11"),
    );

    expect(fromAnotherIp.status).toBe(200);
  });

  it("logout удаляет сессию и очищает cookie", async () => {
    const passwordHash = await hashPassword("right-password-123");
    await prisma.adminUser.create({ data: { username: "tester", passwordHash } });
    await login(loginRequest({ username: "tester", password: "right-password-123" }));
    expect(await prisma.adminSession.count()).toBe(1);

    const response = await logout();

    expect(response.status).toBe(200);
    expect(await prisma.adminSession.count()).toBe(0);
    expect(cookieStore.get("admin_session")).toBeUndefined();
  });
});
