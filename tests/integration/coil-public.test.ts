/**
 * Интеграционный тест публичного GET /api/coil/:id (раздел 8 ТЗ).
 * Не требует моков next/headers/server-only — маршрут не трогает сессии.
 * Требует реальный Postgres — см. заголовок env-guard.test.ts.
 */
import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const { GET } = await import("@/app/api/coil/[id]/route");

const prisma = new PrismaClient();

async function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function seedCoil(active = true) {
  const color = await prisma.color.create({ data: { code: "7024", displayName: "RAL 7024" } });
  const thickness = await prisma.thickness.create({ data: { valueHundredths: 50, displayName: "0,50 мм" } });
  const manufacturer = await prisma.manufacturer.create({
    data: { code: "UZBEKISTAN", displayName: "Узбекистан" },
  });
  const coating = await prisma.coating.create({ data: { code: "VIKING", displayName: "Viking" } });

  return prisma.coil.create({
    data: {
      colorId: color.id,
      thicknessId: thickness.id,
      manufacturerId: manufacturer.id,
      coatingId: coating.id,
      active,
    },
  });
}

describe("GET /api/coil/:id (интеграционный)", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL не задан — см. заголовок env-guard.test.ts.");
    }
  });

  beforeEach(async () => {
    await prisma.coil.deleteMany();
    await prisma.color.deleteMany();
    await prisma.thickness.deleteMany();
    await prisma.manufacturer.deleteMany();
    await prisma.coating.deleteMany();
  });

  afterEach(async () => {
    await prisma.coil.deleteMany();
    await prisma.color.deleteMany();
    await prisma.thickness.deleteMany();
    await prisma.manufacturer.deleteMany();
    await prisma.coating.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("несуществующий id → 404 COIL_NOT_FOUND", async () => {
    const response = await GET(new Request("http://localhost/api/coil/does-not-exist"), await makeParams("does-not-exist"));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("COIL_NOT_FOUND");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("активный рулон → 200 с полной безопасной формой", async () => {
    const coil = await seedCoil(true);
    const response = await GET(new Request(`http://localhost/api/coil/${coil.id}`), await makeParams(coil.id));
    const body = (await response.json()) as {
      id: string;
      active: boolean;
      ral: { code: string; displayName: string };
      thickness: { valueHundredths: number; displayName: string };
      manufacturer: { code: string; displayName: string };
      coating: { code: string; displayName: string };
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: coil.id,
      active: true,
      ral: { code: "7024", displayName: "RAL 7024" },
      thickness: { valueHundredths: 50, displayName: "0,50 мм" },
      manufacturer: { code: "UZBEKISTAN", displayName: "Узбекистан" },
      coating: { code: "VIKING", displayName: "Viking" },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("деактивированный рулон → 410 COIL_INACTIVE-эквивалент с active:false", async () => {
    const coil = await seedCoil(false);
    const response = await GET(new Request(`http://localhost/api/coil/${coil.id}`), await makeParams(coil.id));
    const body = (await response.json()) as { active: boolean };

    expect(response.status).toBe(410);
    expect(body.active).toBe(false);
  });

  it("не содержит служебных полей (createdAt/updatedAt)", async () => {
    const coil = await seedCoil(true);
    const response = await GET(new Request(`http://localhost/api/coil/${coil.id}`), await makeParams(coil.id));
    const body = (await response.json()) as Record<string, unknown>;

    expect(body).not.toHaveProperty("createdAt");
    expect(body).not.toHaveProperty("updatedAt");
  });
});
