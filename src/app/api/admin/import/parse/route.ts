import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { requireAdmin } from "@/lib/auth/session";
import { ExcelParseError, parseImportFile } from "@/lib/excel/parse";
import { loadReferenceData, validateMaterialRow } from "@/lib/material-normalization";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "INVALID_FILE_FORMAT", "Файл не передан");
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      throw new ApiError(400, "INVALID_FILE_FORMAT", "Ожидается файл .xlsx");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let rawRows;
    try {
      rawRows = await parseImportFile(buffer);
    } catch (error) {
      if (error instanceof ExcelParseError) {
        const status = error.code === "TOO_MANY_ROWS" ? 413 : 400;
        throw new ApiError(status, error.code, error.message);
      }
      throw error;
    }

    const refs = await loadReferenceData();
    const rows = rawRows.map((raw) => ({
      rowNumber: raw.rowNumber,
      ...validateMaterialRow(raw, refs),
    }));
    const validRows = rows.filter((row) => row.status === "valid").length;

    return NextResponse.json({
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      rows,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
