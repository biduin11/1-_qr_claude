/**
 * Интеграционный тест /api/admin/import/parse и /confirm — реальная БД,
 * реальные .xlsx-буферы через exceljs, авторизация, повторная валидация на
 * confirm, идемпотентность. Требует реальный Postgres — см. заголовок
 * env-guard.test.ts.
 */
import ExcelJS from "exceljs";
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

const { POST: parseImport } = await import("@/app/api/admin/import/parse/route");
const { POST: confirmImport } = await import("@/app/api/admin/import/confirm/route");
const { resetImportIdempotencyCache } = await import("@/lib/admin/import-idempotency");

const prisma = new PrismaClient();

async function loginAsAdmin(): Promise<void> {
  const admin = await prisma.adminUser.create({
    data: { username: `tester-${Date.now()}-${Math.random()}`, passwordHash: "irrelevant" },
  });
  const session = await prisma.adminSession.create({
    data: { adminUserId: admin.id, expiresAt: new Date(Date.now() + 60_000) },
  });
  cookieStore.set("admin_session", session.id);
}

async function buildXlsx(rows: Array<Array<string | number>>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Import");
  sheet.addRow(["ral", "thickness", "manufacturer", "coating"]);
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function parseRequest(buffer: Buffer): NextRequest {
  const formData = new FormData();
  formData.append(
    "file",
    new File([new Uint8Array(buffer)], "import.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  return new NextRequest("http://localhost:3000/api/admin/import/parse", { method: "POST", body: formData });
}

function confirmRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/import/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function seedRefs() {
  const color = await prisma.color.create({ data: { code: "7024", displayName: "RAL 7024" } });
  const thickness = await prisma.thickness.create({ data: { valueHundredths: 50, displayName: "0,50 мм" } });
  const manufacturer = await prisma.manufacturer.create({
    data: { code: "UZBEKISTAN", displayName: "Узбекистан", aliases: ["uzbekistan"] },
  });
  const coating = await prisma.coating.create({
    data: { code: "VIKING", displayName: "Viking", aliases: ["viking"] },
  });
  return { color, thickness, manufacturer, coating };
}

describe("/api/admin/import/parse и /confirm (интеграционный)", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL не задан — см. заголовок env-guard.test.ts.");
    }
  });

  beforeEach(async () => {
    cookieStore.clear();
    resetImportIdempotencyCache();
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

  it("parse без сессии -> 401, confirm без сессии -> 401", async () => {
    const buffer = await buildXlsx([["7024", "0.50", "uzbekistan", "viking"]]);
    const parseResponse = await parseImport(parseRequest(buffer));
    expect(parseResponse.status).toBe(401);

    const confirmResponse = await confirmImport(confirmRequest({ idempotencyKey: "k1", rows: [] }));
    expect(confirmResponse.status).toBe(401);
  });

  it("превью верно классифицирует валидные и невалидные строки с номерами", async () => {
    await loginAsAdmin();
    await seedRefs();

    const buffer = await buildXlsx([
      ["7024", "0.50", "uzbekistan", "viking"],
      ["9999", "0.50", "uzbekistan", "viking"],
      ["7024", "0.50", "nowhere", "rooftop_barhat"],
    ]);

    const response = await parseImport(parseRequest(buffer));
    const body = (await response.json()) as {
      totalRows: number;
      validRows: number;
      invalidRows: number;
      rows: Array<{ rowNumber: number; status: string; errors?: string[] }>;
    };

    expect(response.status).toBe(200);
    expect(body.totalRows).toBe(3);
    expect(body.validRows).toBe(1);
    expect(body.invalidRows).toBe(2);
    expect(body.rows[0]).toMatchObject({ rowNumber: 2, status: "valid" });
    expect(body.rows[1]).toMatchObject({ rowNumber: 3, status: "invalid" });
    expect(body.rows[2]?.errors).toHaveLength(2);
  });

  it("confirm создаёт только валидные строки, отчёт содержит imported/skipped", async () => {
    await loginAsAdmin();
    const refs = await seedRefs();

    const response = await confirmImport(
      confirmRequest({
        idempotencyKey: crypto.randomUUID(),
        rows: [
          {
            colorId: refs.color.id,
            thicknessId: refs.thickness.id,
            manufacturerId: refs.manufacturer.id,
            coatingId: refs.coating.id,
          },
        ],
      }),
    );
    const body = (await response.json()) as { imported: number; skipped: number };

    expect(response.status).toBe(200);
    expect(body.imported).toBe(1);
    expect(body.skipped).toBe(0);
    expect(await prisma.coil.count()).toBe(1);
  });

  it("повторяющиеся строки создают отдельные Coil (раздел 24 ТЗ)", async () => {
    await loginAsAdmin();
    const refs = await seedRefs();
    const row = {
      colorId: refs.color.id,
      thicknessId: refs.thickness.id,
      manufacturerId: refs.manufacturer.id,
      coatingId: refs.coating.id,
    };

    const response = await confirmImport(
      confirmRequest({ idempotencyKey: crypto.randomUUID(), rows: [row, row, row] }),
    );
    const body = (await response.json()) as { imported: number };

    expect(body.imported).toBe(3);
    expect(await prisma.coil.count()).toBe(3);
  });

  it("повторный confirm с тем же idempotencyKey не дублирует импорт", async () => {
    await loginAsAdmin();
    const refs = await seedRefs();
    const idempotencyKey = crypto.randomUUID();
    const row = {
      colorId: refs.color.id,
      thicknessId: refs.thickness.id,
      manufacturerId: refs.manufacturer.id,
      coatingId: refs.coating.id,
    };

    const first = await confirmImport(confirmRequest({ idempotencyKey, rows: [row] }));
    const firstBody = (await first.json()) as { imported: number };
    expect(firstBody.imported).toBe(1);
    expect(await prisma.coil.count()).toBe(1);

    const second = await confirmImport(confirmRequest({ idempotencyKey, rows: [row] }));
    const secondBody = (await second.json()) as { imported: number };
    expect(secondBody.imported).toBe(1);
    expect(await prisma.coil.count()).toBe(1);
  });

  it("другой idempotencyKey с теми же данными создаёт новый импорт (не путать дедупликацию запроса с дедупликацией рулонов)", async () => {
    await loginAsAdmin();
    const refs = await seedRefs();
    const row = {
      colorId: refs.color.id,
      thicknessId: refs.thickness.id,
      manufacturerId: refs.manufacturer.id,
      coatingId: refs.coating.id,
    };

    await confirmImport(confirmRequest({ idempotencyKey: crypto.randomUUID(), rows: [row] }));
    await confirmImport(confirmRequest({ idempotencyKey: crypto.randomUUID(), rows: [row] }));

    expect(await prisma.coil.count()).toBe(2);
  });

  it("справочник деактивирован между parse и confirm -> строка попадает в skipped, а не создаётся (fail closed)", async () => {
    await loginAsAdmin();
    const refs = await seedRefs();
    const row = {
      colorId: refs.color.id,
      thicknessId: refs.thickness.id,
      manufacturerId: refs.manufacturer.id,
      coatingId: refs.coating.id,
    };

    await prisma.manufacturer.update({ where: { id: refs.manufacturer.id }, data: { active: false } });

    const response = await confirmImport(confirmRequest({ idempotencyKey: crypto.randomUUID(), rows: [row] }));
    const body = (await response.json()) as { imported: number; skipped: number };

    expect(body.imported).toBe(0);
    expect(body.skipped).toBe(1);
    expect(await prisma.coil.count()).toBe(0);
  });

  it("файл, превышающий лимит строк -> 413 TOO_MANY_ROWS", async () => {
    await loginAsAdmin();
    await seedRefs();

    const rows = Array.from({ length: 5001 }, () => ["7024", "0.50", "uzbekistan", "viking"]);
    const buffer = await buildXlsx(rows);

    const response = await parseImport(parseRequest(buffer));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(413);
    expect(body.error.code).toBe("TOO_MANY_ROWS");
  }, 20000);

  it("не-xlsx файл -> 400 INVALID_FILE_FORMAT", async () => {
    await loginAsAdmin();
    const formData = new FormData();
    formData.append("file", new File([new Uint8Array([1, 2, 3])], "not-excel.txt", { type: "text/plain" }));
    const request = new NextRequest("http://localhost:3000/api/admin/import/parse", {
      method: "POST",
      body: formData,
    });

    const response = await parseImport(request);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_FILE_FORMAT");
  });
});
