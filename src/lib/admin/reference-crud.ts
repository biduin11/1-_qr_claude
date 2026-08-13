import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { z } from "zod";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { requireAdmin } from "@/lib/auth/session";
import { isNotFoundError, isUniqueConstraintError } from "@/lib/prisma-errors";

/**
 * Общая форма для Color/Thickness/Manufacturer/Coating — все 4 справочника
 * структурно одинаковы (id, active, createdAt, updatedAt + 1-2 содержательных
 * поля с уникальным constraint). Единая фабрика вместо 4 копий одной и той же
 * валидации/обработки ошибок — конкретных использований ровно 4, не гипотеза
 * "на будущее". См. ARCHITECTURE.md §14/§4.4.
 */
// `any` здесь намеренно — контравариантность параметров функций не даёт
// присвоить типизированные Prisma-делегаты (ColorDelegate/ThicknessDelegate/…)
// переменной с параметром `unknown`. Точность типов сохраняется на уровне
// вызывающего кода (src/lib/admin/resources/*.ts передаёт конкретный
// prisma.color/prisma.thickness/…), фабрика — намеренно "тонкая" граница.
/* eslint-disable @typescript-eslint/no-explicit-any */
type ReferenceDelegate = {
  findMany: (args?: any) => Promise<any[]>;
  create: (args: { data: any }) => Promise<any>;
  update: (args: { where: { id: string }; data: any }) => Promise<any>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function createReferenceDataHandlers<Schema extends z.ZodObject<z.ZodRawShape>>(
  delegate: ReferenceDelegate,
  schema: Schema,
  duplicateMessage: string,
) {
  async function list(request: NextRequest): Promise<NextResponse> {
    try {
      await requireAdmin();
      const activeParam = request.nextUrl.searchParams.get("active");
      const where =
        activeParam === "true" ? { active: true } : activeParam === "false" ? { active: false } : {};
      const items = await delegate.findMany({ where, orderBy: { createdAt: "asc" } });
      return NextResponse.json({ items });
    } catch (error) {
      return apiErrorResponse(error);
    }
  }

  async function create(request: NextRequest): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = await request.json().catch(() => null);
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          parsed.error.issues.map((issue) => issue.message).join("; "),
        );
      }
      try {
        const created = await delegate.create({ data: parsed.data });
        return NextResponse.json(created, { status: 201 });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ApiError(409, "CODE_ALREADY_EXISTS", duplicateMessage);
        }
        throw error;
      }
    } catch (error) {
      return apiErrorResponse(error);
    }
  }

  async function patch(request: NextRequest, id: string): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = await request.json().catch(() => null);
      const parsed = schema.partial().safeParse(body);
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          parsed.error.issues.map((issue) => issue.message).join("; "),
        );
      }
      try {
        const updated = await delegate.update({ where: { id }, data: parsed.data });
        return NextResponse.json(updated);
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ApiError(409, "CODE_ALREADY_EXISTS", duplicateMessage);
        }
        if (isNotFoundError(error)) {
          throw new ApiError(404, "NOT_FOUND", "Запись не найдена");
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
        const updated = await delegate.update({ where: { id }, data: { active } });
        return NextResponse.json(updated);
      } catch (error) {
        if (isNotFoundError(error)) {
          throw new ApiError(404, "NOT_FOUND", "Запись не найдена");
        }
        throw error;
      }
    } catch (error) {
      return apiErrorResponse(error);
    }
  }

  return { list, create, patch, setActive };
}
