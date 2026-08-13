import ExcelJS from "exceljs";

/** Защита от исчерпания памяти при парсинге на сервере (EXCEL_IMPORT.md). */
export const MAX_IMPORT_ROWS = 5000;

const REQUIRED_COLUMNS = ["ral", "thickness", "manufacturer", "coating"] as const;

export class ExcelParseError extends Error {
  constructor(
    public readonly code: "INVALID_FILE_FORMAT" | "TOO_MANY_ROWS",
    message: string,
  ) {
    super(message);
    this.name = "ExcelParseError";
  }
}

export type RawImportRow = {
  rowNumber: number;
  ral: string;
  thickness: string;
  manufacturer: string;
  coating: string;
};

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if ("result" in value) {
      return cellToString((value as { result: ExcelJS.CellValue }).result);
    }
    if ("text" in value) {
      return String((value as { text: unknown }).text ?? "");
    }
    return "";
  }
  return String(value).trim();
}

/**
 * Разбирает лист "Import" загруженного .xlsx (EXCEL_IMPORT.md). Первая
 * полностью пустая строка данных считается концом диапазона. Не нормализует
 * и не валидирует значения — только извлекает сырой текст по номерам строк.
 */
export async function parseImportFile(buffer: Buffer): Promise<RawImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new ExcelParseError(
      "INVALID_FILE_FORMAT",
      "Не удалось прочитать файл — убедитесь, что это корректный .xlsx",
    );
  }

  const sheet = workbook.worksheets.find((ws) => ws.name.trim().toLowerCase() === "import");
  if (!sheet) {
    throw new ExcelParseError("INVALID_FILE_FORMAT", 'В файле не найден лист "Import"');
  }

  const columnIndex = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const value = cellToString(cell.value).toLowerCase();
    if (value) columnIndex.set(value, colNumber);
  });

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !columnIndex.has(column));
  if (missingColumns.length > 0) {
    throw new ExcelParseError(
      "INVALID_FILE_FORMAT",
      `В листе "Import" отсутствуют колонки: ${missingColumns.join(", ")}`,
    );
  }

  const rows: RawImportRow[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const getColumn = (name: (typeof REQUIRED_COLUMNS)[number]): string => {
      const colNumber = columnIndex.get(name);
      if (!colNumber) return "";
      return cellToString(row.getCell(colNumber).value);
    };

    const ral = getColumn("ral");
    const thickness = getColumn("thickness");
    const manufacturer = getColumn("manufacturer");
    const coating = getColumn("coating");

    // Первая полностью пустая строка данных — конец диапазона (EXCEL_IMPORT.md).
    if (!ral && !thickness && !manufacturer && !coating) {
      break;
    }

    if (rows.length >= MAX_IMPORT_ROWS) {
      throw new ExcelParseError(
        "TOO_MANY_ROWS",
        `Превышен лимит строк за один импорт (${MAX_IMPORT_ROWS})`,
      );
    }

    rows.push({ rowNumber, ral, thickness, manufacturer, coating });
  }

  return rows;
}
