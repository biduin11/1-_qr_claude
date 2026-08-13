import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { getPublicCoil } from "@/lib/public/coil";

// Данные рулона для решения МОЖНО/СТОП — всегда live, никогда не кэшируется
// (ARCHITECTURE.md §9, раздел 32 ТЗ).
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const coil = await getPublicCoil(id);

    if (!coil) {
      return NextResponse.json(
        { error: { code: "COIL_NOT_FOUND", message: "Рулон не найден" } },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!coil.active) {
      return NextResponse.json(coil, { status: 410, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json(coil, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
