import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { ExcelParseError, MAX_IMPORT_ROWS, parseImportFile } from "@/lib/excel/parse";

async function buildWorkbook(options: {
  sheetName?: string;
  headers?: string[];
  rows?: Array<Array<string | number>>;
}): Promise<Buffer> {
  const { sheetName = "Import", headers = ["ral", "thickness", "manufacturer", "coating"], rows = [] } = options;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  for (const row of rows) {
    sheet.addRow(row);
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe("parseImportFile", () => {
  it("разбирает корректный файл с несколькими строками", async () => {
    const buffer = await buildWorkbook({
      rows: [
        ["7024", "0.50", "uzbekistan", "viking"],
        ["9003", "0.45", "severstal", "matte"],
      ],
    });

    const rows = await parseImportFile(buffer);

    expect(rows).toEqual([
      { rowNumber: 2, ral: "7024", thickness: "0.50", manufacturer: "uzbekistan", coating: "viking" },
      { rowNumber: 3, ral: "9003", thickness: "0.45", manufacturer: "severstal", coating: "matte" },
    ]);
  });

  it("останавливается на первой полностью пустой строке", async () => {
    const buffer = await buildWorkbook({
      rows: [
        ["7024", "0.50", "uzbekistan", "viking"],
        ["", "", "", ""],
        ["9003", "0.45", "severstal", "matte"],
      ],
    });

    const rows = await parseImportFile(buffer);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.ral).toBe("7024");
  });

  it("допускает колонки в произвольном порядке", async () => {
    const buffer = await buildWorkbook({
      headers: ["coating", "ral", "manufacturer", "thickness"],
      rows: [["viking", "7024", "uzbekistan", "0.50"]],
    });

    const rows = await parseImportFile(buffer);

    expect(rows[0]).toEqual({
      rowNumber: 2,
      ral: "7024",
      thickness: "0.50",
      manufacturer: "uzbekistan",
      coating: "viking",
    });
  });

  it("числовая ячейка толщины читается как строка", async () => {
    const buffer = await buildWorkbook({ rows: [["7024", 0.5, "uzbekistan", "viking"]] });
    const rows = await parseImportFile(buffer);
    expect(rows[0]?.thickness).toBe("0.5");
  });

  it("отсутствие листа Import -> ExcelParseError INVALID_FILE_FORMAT", async () => {
    const buffer = await buildWorkbook({ sheetName: "Sheet1" });
    await expect(parseImportFile(buffer)).rejects.toMatchObject({
      code: "INVALID_FILE_FORMAT",
    });
  });

  it("отсутствие обязательной колонки -> ExcelParseError INVALID_FILE_FORMAT", async () => {
    const buffer = await buildWorkbook({ headers: ["ral", "thickness", "manufacturer"] });
    await expect(parseImportFile(buffer)).rejects.toBeInstanceOf(ExcelParseError);
    await expect(parseImportFile(buffer)).rejects.toMatchObject({ code: "INVALID_FILE_FORMAT" });
  });

  it("некорректный бинарный файл -> ExcelParseError INVALID_FILE_FORMAT", async () => {
    const buffer = Buffer.from("это не xlsx файл, а просто текст");
    await expect(parseImportFile(buffer)).rejects.toMatchObject({ code: "INVALID_FILE_FORMAT" });
  });

  it("превышение лимита строк -> ExcelParseError TOO_MANY_ROWS", async () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => [
      "7024",
      "0.50",
      "uzbekistan",
      "viking",
      String(i),
    ]);
    const buffer = await buildWorkbook({ rows });
    await expect(parseImportFile(buffer)).rejects.toMatchObject({ code: "TOO_MANY_ROWS" });
  });
});
