import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { requireAdmin } from "@/lib/auth/session";
import { generateImportTemplate } from "@/lib/excel/template";

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();
    const buffer = await generateImportTemplate();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="kontrol-metalla-import-template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
