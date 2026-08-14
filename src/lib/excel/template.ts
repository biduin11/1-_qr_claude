import ExcelJS from "exceljs";

import { COLUMN_LABELS } from "@/lib/excel/parse";
import { prisma } from "@/lib/prisma";

/**
 * Шаблон для массового импорта (EXCEL_IMPORT.md) — лист "Import" с нужными
 * колонками и лист "Reference" с актуальными допустимыми значениями,
 * сгенерированный из текущего состояния справочников на момент скачивания.
 */
export async function generateImportTemplate(): Promise<Buffer> {
  const [colors, thicknesses, manufacturers, coatings] = await Promise.all([
    prisma.color.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.thickness.findMany({ where: { active: true }, orderBy: { valueHundredths: "asc" } }),
    prisma.manufacturer.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    prisma.coating.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
  ]);

  const workbook = new ExcelJS.Workbook();

  const importSheet = workbook.addWorksheet("Import");
  importSheet.columns = [
    { header: COLUMN_LABELS.ral, key: "ral", width: 14 },
    { header: COLUMN_LABELS.thickness, key: "thickness", width: 14 },
    { header: COLUMN_LABELS.manufacturer, key: "manufacturer", width: 20 },
    { header: COLUMN_LABELS.coating, key: "coating", width: 20 },
  ];
  importSheet.getRow(1).font = { bold: true };

  const referenceSheet = workbook.addWorksheet("Reference");
  referenceSheet.columns = [
    { header: "Тип", key: "type", width: 14 },
    { header: "Код", key: "code", width: 16 },
    { header: "Название", key: "name", width: 24 },
  ];
  referenceSheet.getRow(1).font = { bold: true };

  for (const color of colors) {
    referenceSheet.addRow({ type: COLUMN_LABELS.ral, code: color.code, name: color.displayName });
  }
  for (const thickness of thicknesses) {
    referenceSheet.addRow({
      type: COLUMN_LABELS.thickness,
      code: (thickness.valueHundredths / 100).toFixed(2),
      name: thickness.displayName,
    });
  }
  for (const manufacturer of manufacturers) {
    referenceSheet.addRow({
      type: COLUMN_LABELS.manufacturer,
      code: manufacturer.code.toLowerCase(),
      name: manufacturer.displayName,
    });
  }
  for (const coating of coatings) {
    referenceSheet.addRow({
      type: COLUMN_LABELS.coating,
      code: coating.code.toLowerCase(),
      name: coating.displayName,
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
