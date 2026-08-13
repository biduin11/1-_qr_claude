import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { requireAdmin } from "@/lib/auth/session";
import { getCachedImportResult, setCachedImportResult } from "@/lib/admin/import-idempotency";
import type { ImportConfirmResult } from "@/lib/admin/import-idempotency";
import { prisma } from "@/lib/prisma";
import { importConfirmSchema } from "@/lib/validation/import";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);
    const parsed = importConfirmSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues.map((issue) => issue.message).join("; "),
      );
    }
    const { idempotencyKey, rows } = parsed.data;

    const cached = getCachedImportResult(idempotencyKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Сервер ничего не хранил с момента /parse — payload трактуется как
    // недоверенный, ссылки перепроверяются заново (ARCHITECTURE.md §7).
    const [colors, thicknesses, manufacturers, coatings] = await Promise.all([
      prisma.color.findMany({ where: { active: true }, select: { id: true } }),
      prisma.thickness.findMany({ where: { active: true }, select: { id: true } }),
      prisma.manufacturer.findMany({ where: { active: true }, select: { id: true } }),
      prisma.coating.findMany({ where: { active: true }, select: { id: true } }),
    ]);
    const activeColorIds = new Set(colors.map((item) => item.id));
    const activeThicknessIds = new Set(thicknesses.map((item) => item.id));
    const activeManufacturerIds = new Set(manufacturers.map((item) => item.id));
    const activeCoatingIds = new Set(coatings.map((item) => item.id));

    const toCreate: typeof rows = [];
    const skippedRows: ImportConfirmResult["skippedRows"] = [];

    for (const row of rows) {
      const valid =
        activeColorIds.has(row.colorId) &&
        activeThicknessIds.has(row.thicknessId) &&
        activeManufacturerIds.has(row.manufacturerId) &&
        activeCoatingIds.has(row.coatingId);

      if (valid) {
        toCreate.push(row);
      } else {
        skippedRows.push({
          row,
          reason: "Справочная запись стала неактивной или была удалена с момента предпросмотра",
        });
      }
    }

    if (toCreate.length > 0) {
      await prisma.coil.createMany({ data: toCreate });
    }

    const result: ImportConfirmResult = {
      imported: toCreate.length,
      skipped: skippedRows.length,
      skippedRows,
    };
    setCachedImportResult(idempotencyKey, result);

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
