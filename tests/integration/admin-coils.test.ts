/**
 * Интеграционный тест CRUD рулонов (src/lib/admin/coils.ts) — включая
 * проверку авторизации (без сессии — 401, состояние не меняется) и
 * fail-closed проверку активности справочных ссылок при создании/правке.
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

const { coilHandlers } = await import("@/lib/admin/coils");

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

function patchRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "PATCH",
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

async function seedRefs(overrides?: { manufacturerActive?: boolean }) {
  const color = await prisma.color.create({ data: { code: "7024", displayName: "RAL 7024" } });
  const thickness = await prisma.thickness.create({ data: { valueHundredths: 50, displayName: "0,50 мм" } });
  const manufacturer = await prisma.manufacturer.create({
    data: { code: "UZBEKISTAN", displayName: "Узбекистан", active: overrides?.manufacturerActive ?? true },
  });
  const coating = await prisma.coating.create({ data: { code: "VIKING", displayName: "Viking" } });
  return { color, thickness, manufacturer, coating };
}

describe("admin coils CRUD (интеграционный)", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL не задан — см. заголовок env-guard.test.ts.");
    }
  });

  beforeEach(async () => {
    cookieStore.clear();
    await prisma.coil.deleteMany();
    await prisma.color.deleteMany();
    await prisma.thickness.deleteMany();
    await prisma.manufacturer.deleteMany();
    await prisma.coating.deleteMany();
    await prisma.adminSession.deleteMany();
    await prisma.adminUser.deleteMany();
  });

  afterEach(() => {
    cookieStore.clear();
  });

  afterAll(async () => {
    await prisma.coil.deleteMany();
    await prisma.color.deleteMany();
    await prisma.thickness.deleteMany();
    await prisma.manufacturer.deleteMany();
    await prisma.coating.deleteMany();
    await prisma.adminSession.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.$disconnect();
  });

  it("список без сессии → 401 UNAUTHORIZED", async () => {
    const response = await coilHandlers.list(getRequest("http://localhost:3000/api/admin/coils"));
    expect(response.status).toBe(401);
  });

  it("создание без сессии → 401, рулон не создаётся", async () => {
    const refs = await seedRefs();
    const response = await coilHandlers.create(
      postRequest("http://localhost:3000/api/admin/coils", {
        colorId: refs.color.id,
        thicknessId: refs.thickness.id,
        manufacturerId: refs.manufacturer.id,
        coatingId: refs.coating.id,
      }),
    );

    expect(response.status).toBe(401);
    expect(await prisma.coil.count()).toBe(0);
  });

  it("деактивация без сессии → 401, состояние не меняется", async () => {
    const refs = await seedRefs();
    const coil = await prisma.coil.create({
      data: {
        colorId: refs.color.id,
        thicknessId: refs.thickness.id,
        manufacturerId: refs.manufacturer.id,
        coatingId: refs.coating.id,
      },
    });

    const response = await coilHandlers.setActive(coil.id, false);
    expect(response.status).toBe(401);

    const reloaded = await prisma.coil.findUniqueOrThrow({ where: { id: coil.id } });
    expect(reloaded.active).toBe(true);
  });

  it("создание с валидными активными ссылками → 201, появляется в списке", async () => {
    await loginAsAdmin();
    const refs = await seedRefs();

    const created = await coilHandlers.create(
      postRequest("http://localhost:3000/api/admin/coils", {
        colorId: refs.color.id,
        thicknessId: refs.thickness.id,
        manufacturerId: refs.manufacturer.id,
        coatingId: refs.coating.id,
      }),
    );
    expect(created.status).toBe(201);

    const list = await coilHandlers.list(getRequest("http://localhost:3000/api/admin/coils"));
    const body = (await list.json()) as { items: Array<{ id: string }> };
    expect(body.items).toHaveLength(1);
  });

  it("создание со ссылкой на деактивированный справочник → 400 VALIDATION_ERROR, рулон не создаётся (fail closed)", async () => {
    await loginAsAdmin();
    const refs = await seedRefs({ manufacturerActive: false });

    const response = await coilHandlers.create(
      postRequest("http://localhost:3000/api/admin/coils", {
        colorId: refs.color.id,
        thicknessId: refs.thickness.id,
        manufacturerId: refs.manufacturer.id,
        coatingId: refs.coating.id,
      }),
    );
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.coil.count()).toBe(0);
  });

  it("два рулона с одинаковыми 4 характеристиками — оба создаются с разными id (раздел 24 ТЗ)", async () => {
    await loginAsAdmin();
    const refs = await seedRefs();
    const payload = {
      colorId: refs.color.id,
      thicknessId: refs.thickness.id,
      manufacturerId: refs.manufacturer.id,
      coatingId: refs.coating.id,
    };

    const first = await coilHandlers.create(postRequest("http://localhost:3000/api/admin/coils", payload));
    const second = await coilHandlers.create(postRequest("http://localhost:3000/api/admin/coils", payload));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const firstBody = (await first.json()) as { id: string };
    const secondBody = (await second.json()) as { id: string };
    expect(firstBody.id).not.toBe(secondBody.id);
    expect(await prisma.coil.count()).toBe(2);
  });

  it("деактивация исключает рулон из active=true, восстановление возвращает", async () => {
    await loginAsAdmin();
    const refs = await seedRefs();
    const coil = await prisma.coil.create({
      data: {
        colorId: refs.color.id,
        thicknessId: refs.thickness.id,
        manufacturerId: refs.manufacturer.id,
        coatingId: refs.coating.id,
      },
    });

    await coilHandlers.setActive(coil.id, false);
    const afterDeactivate = await coilHandlers.list(
      getRequest("http://localhost:3000/api/admin/coils?active=true"),
    );
    const afterDeactivateBody = (await afterDeactivate.json()) as { items: unknown[] };
    expect(afterDeactivateBody.items).toHaveLength(0);

    await coilHandlers.setActive(coil.id, true);
    const afterRestore = await coilHandlers.list(
      getRequest("http://localhost:3000/api/admin/coils?active=true"),
    );
    const afterRestoreBody = (await afterRestore.json()) as { items: Array<{ id: string }> };
    expect(afterRestoreBody.items.map((item) => item.id)).toContain(coil.id);
  });

  it("правка на несуществующий id → 404 NOT_FOUND", async () => {
    await loginAsAdmin();
    const refs = await seedRefs();

    const response = await coilHandlers.patch(
      patchRequest("http://localhost:3000/api/admin/coils/missing", { colorId: refs.color.id }),
      "missing-id",
    );

    expect(response.status).toBe(404);
  });

  it("search фильтрует по коду/названию связанных справочников", async () => {
    await loginAsAdmin();
    const refs = await seedRefs();
    await prisma.coil.create({
      data: {
        colorId: refs.color.id,
        thicknessId: refs.thickness.id,
        manufacturerId: refs.manufacturer.id,
        coatingId: refs.coating.id,
      },
    });

    const matching = await coilHandlers.list(
      getRequest("http://localhost:3000/api/admin/coils?search=viking"),
    );
    const matchingBody = (await matching.json()) as { items: unknown[] };
    expect(matchingBody.items).toHaveLength(1);

    const notMatching = await coilHandlers.list(
      getRequest("http://localhost:3000/api/admin/coils?search=nonexistent-term"),
    );
    const notMatchingBody = (await notMatching.json()) as { items: unknown[] };
    expect(notMatchingBody.items).toHaveLength(0);
  });
});
