/**
 * Интеграционный тест генерации Excel-шаблона (EXCEL_IMPORT.md) — реальная
 * БД, реальная генерация .xlsx через exceljs, читаем результат обратно, чтобы
 * убедиться, что это действительно валидный файл с ожидаемым содержимым.
 * Требует реальный Postgres — см. заголовок env-guard.test.ts.
 */
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const { generateImportTemplate } = await import("@/lib/excel/template");

const prisma = new PrismaClient();

describe("generateImportTemplate (интеграционный)", () => {
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

  afterAll(async () => {
    await prisma.coil.deleteMany();
    await prisma.color.deleteMany();
    await prisma.thickness.deleteMany();
    await prisma.manufacturer.deleteMany();
    await prisma.coating.deleteMany();
    await prisma.$disconnect();
  });

  it("содержит листы Import и Reference с актуальными активными справочниками", async () => {
    await prisma.color.create({ data: { code: "7024", displayName: "RAL 7024", active: true } });
    await prisma.color.create({ data: { code: "9003", displayName: "RAL 9003", active: false } });
    await prisma.thickness.create({ data: { valueHundredths: 50, displayName: "0,50 мм", active: true } });
    await prisma.manufacturer.create({
      data: { code: "UZBEKISTAN", displayName: "Узбекистан", active: true },
    });
    await prisma.coating.create({ data: { code: "VIKING", displayName: "Viking", active: true } });

    const buffer = await generateImportTemplate();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const importSheet = workbook.getWorksheet("Import");
    expect(importSheet).toBeDefined();
    expect(importSheet?.getRow(1).getCell(1).value).toBe("ral");
    expect(importSheet?.getRow(1).getCell(2).value).toBe("thickness");
    expect(importSheet?.getRow(1).getCell(3).value).toBe("manufacturer");
    expect(importSheet?.getRow(1).getCell(4).value).toBe("coating");

    const referenceSheet = workbook.getWorksheet("Reference");
    expect(referenceSheet).toBeDefined();

    const referenceRows: string[][] = [];
    referenceSheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      referenceRows.push([String(row.getCell(1).value), String(row.getCell(2).value), String(row.getCell(3).value)]);
    });

    // Активный RAL 7024 присутствует, деактивированный RAL 9003 — нет.
    expect(referenceRows).toContainEqual(["ral", "7024", "RAL 7024"]);
    expect(referenceRows.some((row) => row[1] === "9003")).toBe(false);
    expect(referenceRows).toContainEqual(["manufacturer", "uzbekistan", "Узбекистан"]);
    expect(referenceRows).toContainEqual(["coating", "viking", "Viking"]);
  });

  it("пустые справочники -> Reference лист без строк данных, но не падает", async () => {
    const buffer = await generateImportTemplate();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const referenceSheet = workbook.getWorksheet("Reference");
    expect(referenceSheet?.rowCount).toBe(1);
  });
});
