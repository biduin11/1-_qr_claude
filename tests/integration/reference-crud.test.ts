/**
 * Интеграционный тест CRUD-фабрики справочников (src/lib/admin/reference-crud.ts)
 * на примере Color и Manufacturer (второй — чтобы покрыть alias-нормализацию).
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

const { colorHandlers } = await import("@/lib/admin/resources/colors");
const { manufacturerHandlers } = await import("@/lib/admin/resources/manufacturers");

const prisma = new PrismaClient();

function getRequest(url: string): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

function postRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loginAsAdmin(): Promise<void> {
  const admin = await prisma.adminUser.create({
    data: { username: `tester-${Date.now()}-${Math.random()}`, passwordHash: "irrelevant" },
  });
  const session = await prisma.adminSession.create({
    data: { adminUserId: admin.id, expiresAt: new Date(Date.now() + 60_000) },
  });
  cookieStore.set("admin_session", session.id);
}

describe("reference-data CRUD (интеграционный)", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL не задан — см. заголовок env-guard.test.ts.");
    }
  });

  beforeEach(async () => {
    cookieStore.clear();
    await prisma.color.deleteMany();
    await prisma.manufacturer.deleteMany();
    await prisma.adminSession.deleteMany();
    await prisma.adminUser.deleteMany();
  });

  afterEach(() => {
    cookieStore.clear();
  });

  afterAll(async () => {
    await prisma.color.deleteMany();
    await prisma.manufacturer.deleteMany();
    await prisma.adminSession.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.$disconnect();
  });

  it("list без сессии → 401 UNAUTHORIZED", async () => {
    const response = await colorHandlers.list(getRequest("http://localhost:3000/api/admin/colors"));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("create → 201, запись появляется в list", async () => {
    await loginAsAdmin();

    const created = await colorHandlers.create(
      postRequest("http://localhost:3000/api/admin/colors", { code: "7024", displayName: "RAL 7024" }),
    );
    expect(created.status).toBe(201);

    const list = await colorHandlers.list(getRequest("http://localhost:3000/api/admin/colors"));
    const body = (await list.json()) as { items: Array<{ code: string }> };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.code).toBe("7024");
  });

  it("создание с уже существующим кодом → 409 CODE_ALREADY_EXISTS", async () => {
    await loginAsAdmin();
    await colorHandlers.create(
      postRequest("http://localhost:3000/api/admin/colors", { code: "7024", displayName: "RAL 7024" }),
    );

    const duplicate = await colorHandlers.create(
      postRequest("http://localhost:3000/api/admin/colors", { code: "7024", displayName: "Другое имя" }),
    );
    const body = (await duplicate.json()) as { error: { code: string } };

    expect(duplicate.status).toBe(409);
    expect(body.error.code).toBe("CODE_ALREADY_EXISTS");
  });

  it("некорректный код RAL (буквы) → 400 VALIDATION_ERROR", async () => {
    await loginAsAdmin();
    const response = await colorHandlers.create(
      postRequest("http://localhost:3000/api/admin/colors", { code: "abc", displayName: "?" }),
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("деактивация исключает запись из списка active=true и возвращает её при active=false", async () => {
    await loginAsAdmin();
    const created = await colorHandlers.create(
      postRequest("http://localhost:3000/api/admin/colors", { code: "7024", displayName: "RAL 7024" }),
    );
    const { id } = (await created.json()) as { id: string };

    await colorHandlers.setActive(id, false);

    const activeList = await colorHandlers.list(
      getRequest("http://localhost:3000/api/admin/colors?active=true"),
    );
    const activeBody = (await activeList.json()) as { items: unknown[] };
    expect(activeBody.items).toHaveLength(0);

    const inactiveList = await colorHandlers.list(
      getRequest("http://localhost:3000/api/admin/colors?active=false"),
    );
    const inactiveBody = (await inactiveList.json()) as { items: Array<{ id: string; active: boolean }> };
    expect(inactiveBody.items).toHaveLength(1);
    expect(inactiveBody.items[0]?.active).toBe(false);
  });

  it("restore возвращает деактивированную запись в active=true", async () => {
    await loginAsAdmin();
    const created = await colorHandlers.create(
      postRequest("http://localhost:3000/api/admin/colors", { code: "7024", displayName: "RAL 7024" }),
    );
    const { id } = (await created.json()) as { id: string };

    await colorHandlers.setActive(id, false);
    await colorHandlers.setActive(id, true);

    const activeList = await colorHandlers.list(
      getRequest("http://localhost:3000/api/admin/colors?active=true"),
    );
    const activeBody = (await activeList.json()) as { items: Array<{ id: string }> };
    expect(activeBody.items.map((item) => item.id)).toContain(id);
  });

  it("manufacturer: код приводится к верхнему регистру, aliases — к нижнему без дублей", async () => {
    await loginAsAdmin();

    const response = await manufacturerHandlers.create(
      postRequest("http://localhost:3000/api/admin/manufacturers", {
        code: "uzbekistan",
        displayName: "Узбекистан",
        aliases: ["Uzbekistan", "UZBEKISTAN", "uzb"],
      }),
    );
    const body = (await response.json()) as { code: string; aliases: string[] };

    expect(response.status).toBe(201);
    expect(body.code).toBe("UZBEKISTAN");
    expect(body.aliases.sort()).toEqual(["uzb", "uzbekistan"]);
  });
});
