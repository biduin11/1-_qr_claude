import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isNotFoundError } from "@/lib/prisma-errors";
import { coilInputSchema } from "@/lib/validation/coil";

/**
 * Coil структурно отличается от 4 простых справочников (раздел 4 модели,
 * не 1-2 поля + code, а 4 FK-ссылки, без уникального constraint на
 * комбинацию — раздел 24 ТЗ) — поэтому не используется createReferenceDataHandlers,
 * а не потому что забыли про переиспользование (ARCHITECTURE.md §14).
 */
const coilInclude = {
  color: true,
  thickness: true,
  manufacturer: true,
  coating: true,
} as const;

type CoilRefs = {
  colorId: string;
  thicknessId: string;
  manufacturerId: string;
  coatingId: string;
};

/**
 * Раздел 23 ТЗ требует, чтобы UI предлагал только активные значения
 * справочников — но UI не единственный путь создания/редактирования рулона
 * (прямой вызов API), поэтому активность и существование перепроверяются
 * здесь тоже, а не только на уровне формы (fail closed).
 */
async function assertReferencesActive(refs: CoilRefs): Promise<void> {
  const [color, thickness, manufacturer, coating] = await Promise.all([
    prisma.color.findUnique({ where: { id: refs.colorId } }),
    prisma.thickness.findUnique({ where: { id: refs.thicknessId } }),
    prisma.manufacturer.findUnique({ where: { id: refs.manufacturerId } }),
    prisma.coating.findUnique({ where: { id: refs.coatingId } }),
  ]);

  const missing: string[] = [];
  if (!color?.active) missing.push("цвет RAL");
  if (!thickness?.active) missing.push("толщина");
  if (!manufacturer?.active) missing.push("производитель");
  if (!coating?.active) missing.push("покрытие");

  if (missing.length > 0) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      `Выбрана несуществующая или неактивная запись справочника: ${missing.join(", ")}`,
    );
  }
}

async function list(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();
    const params = request.nextUrl.searchParams;

    const where: Prisma.CoilWhereInput = {};

    const activeParam = params.get("active");
    if (activeParam === "true") {
      where.active = true;
    } else if (activeParam === "false") {
      where.active = false;
    }

    const colorId = params.get("colorId");
    if (colorId) where.colorId = colorId;
    const thicknessId = params.get("thicknessId");
    if (thicknessId) where.thicknessId = thicknessId;
    const manufacturerId = params.get("manufacturerId");
    if (manufacturerId) where.manufacturerId = manufacturerId;
    const coatingId = params.get("coatingId");
    if (coatingId) where.coatingId = coatingId;

    const search = params.get("search")?.trim();
    if (search) {
      where.OR = [
        { color: { code: { contains: search, mode: "insensitive" } } },
        { color: { displayName: { contains: search, mode: "insensitive" } } },
        { thickness: { displayName: { contains: search, mode: "insensitive" } } },
        { manufacturer: { code: { contains: search, mode: "insensitive" } } },
        { manufacturer: { displayName: { contains: search, mode: "insensitive" } } },
        { coating: { code: { contains: search, mode: "insensitive" } } },
        { coating: { displayName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const items = await prisma.coil.findMany({
      where,
      include: coilInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

async function create(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    const parsed = coilInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues.map((issue) => issue.message).join("; "),
      );
    }

    await assertReferencesActive(parsed.data);

    const created = await prisma.coil.create({ data: parsed.data, include: coilInclude });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

async function patch(request: NextRequest, id: string): Promise<NextResponse> {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    const parsed = coilInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues.map((issue) => issue.message).join("; "),
      );
    }

    const existing = await prisma.coil.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "NOT_FOUND", "Рулон не найден");
    }

    await assertReferencesActive({
      colorId: parsed.data.colorId ?? existing.colorId,
      thicknessId: parsed.data.thicknessId ?? existing.thicknessId,
      manufacturerId: parsed.data.manufacturerId ?? existing.manufacturerId,
      coatingId: parsed.data.coatingId ?? existing.coatingId,
    });

    try {
      const updated = await prisma.coil.update({
        where: { id },
        data: parsed.data,
        include: coilInclude,
      });
      return NextResponse.json(updated);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Рулон не найден");
      }
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}

async function setActive(id: string, active: boolean): Promise<NextResponse> {
  try {
    await requireAdmin();
    try {
      const updated = await prisma.coil.update({
        where: { id },
        data: { active },
        include: coilInclude,
      });
      return NextResponse.json(updated);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Рулон не найден");
      }
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export const coilHandlers = { list, create, patch, setActive };
