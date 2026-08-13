import type { Coating, Color, Manufacturer, Thickness } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Единый модуль нормализации (ARCHITECTURE.md §5, раздел 13 ТЗ). Используется
 * и Excel-импортом (Iteration 4), и позже /check (Iteration 5) — единственное
 * место, где сырые строки из внешнего источника (1С, Excel) превращаются в
 * ссылки на канонические записи справочников. Два принципиально разных
 * алгоритма внутри, намеренно не унифицированные:
 *
 *  - RAL и толщина — форматная нормализация (нет aliases, у Color/Thickness
 *    это поле осознанно отсутствует).
 *  - Производитель и покрытие — точный alias-lookup, без fuzzy matching.
 *
 * Неизвестное значение никогда не угадывается — только явный статус "unknown".
 */

export type ReferenceData = {
  colors: Color[];
  thicknesses: Thickness[];
  manufacturers: Manufacturer[];
  coatings: Coating[];
};

export async function loadReferenceData(): Promise<ReferenceData> {
  const [colors, thicknesses, manufacturers, coatings] = await Promise.all([
    prisma.color.findMany(),
    prisma.thickness.findMany(),
    prisma.manufacturer.findMany(),
    prisma.coating.findMany(),
  ]);
  return { colors, thicknesses, manufacturers, coatings };
}

export type NormalizationResult<T> =
  | { status: "ok"; record: T }
  | { status: "missing" }
  | { status: "unknown" }
  | { status: "inactive"; record: T };

function ok<T>(record: T): NormalizationResult<T> {
  return { status: "ok", record };
}

/** RAL — только цифры, без слова "RAL", без пробелов (QR_CONTRACT.md). */
export function normalizeRal(raw: string, colors: Color[]): NormalizationResult<Color> {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return { status: "missing" };

  const cleaned = trimmed.replace(/^ral\s*/i, "").replace(/\s+/g, "");
  if (!/^\d+$/.test(cleaned)) return { status: "unknown" };

  const match = colors.find((color) => color.code === cleaned);
  if (!match) return { status: "unknown" };
  return match.active ? ok(match) : { status: "inactive", record: match };
}

/** Толщина в мм, запятая/точка, необязательное "мм" (QR_CONTRACT.md). */
export function normalizeThickness(raw: string, thicknesses: Thickness[]): NormalizationResult<Thickness> {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return { status: "missing" };

  const cleaned = trimmed.replace(/мм\s*$/i, "").trim().replace(",", ".");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return { status: "unknown" };

  const valueHundredths = Math.round(parsed * 100);
  const match = thicknesses.find((thickness) => thickness.valueHundredths === valueHundredths);
  if (!match) return { status: "unknown" };
  return match.active ? ok(match) : { status: "inactive", record: match };
}

type AliasedRecord = { code: string; active: boolean; aliases: string[] };

/** Производитель/покрытие — точный alias-lookup, без fuzzy matching (раздел 13 ТЗ). */
function normalizeByAlias<T extends AliasedRecord>(raw: string, records: T[]): NormalizationResult<T> {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return { status: "missing" };

  const cleaned = trimmed.toLowerCase();
  const match = records.find(
    (record) =>
      record.code.toLowerCase() === cleaned || record.aliases.some((alias) => alias.toLowerCase() === cleaned),
  );
  if (!match) return { status: "unknown" };
  return match.active ? ok(match) : { status: "inactive", record: match };
}

export function normalizeManufacturer(raw: string, manufacturers: Manufacturer[]): NormalizationResult<Manufacturer> {
  return normalizeByAlias(raw, manufacturers);
}

export function normalizeCoating(raw: string, coatings: Coating[]): NormalizationResult<Coating> {
  return normalizeByAlias(raw, coatings);
}

export type RawMaterialRow = {
  ral: string;
  thickness: string;
  manufacturer: string;
  coating: string;
};

export type MaterialRowValidation =
  | { status: "valid"; colorId: string; thicknessId: string; manufacturerId: string; coatingId: string }
  | { status: "invalid"; errors: string[] };

const FIELD_LABELS = {
  ral: "цвет RAL",
  thickness: "толщина",
  manufacturer: "производитель",
  coating: "покрытие",
} as const;

function describe(field: keyof typeof FIELD_LABELS, result: NormalizationResult<unknown>, raw: string): string | null {
  const label = FIELD_LABELS[field];
  switch (result.status) {
    case "missing":
      return `Не указано значение поля «${label}»`;
    case "unknown":
      return `Неизвестное значение поля «${label}»: ${raw}`;
    case "inactive":
      return `Значение поля «${label}» деактивировано: ${raw}`;
    case "ok":
      return null;
  }
}

/**
 * Валидирует и нормализует одну строку (общая для /check и Excel-импорта).
 * Собирает ВСЕ ошибки поля, не останавливается на первой — раздел 18 ТЗ
 * ("показывать все несовпадающие характеристики") применяется и здесь.
 */
export function validateMaterialRow(raw: RawMaterialRow, refs: ReferenceData): MaterialRowValidation {
  const ral = normalizeRal(raw.ral, refs.colors);
  const thickness = normalizeThickness(raw.thickness, refs.thicknesses);
  const manufacturer = normalizeManufacturer(raw.manufacturer, refs.manufacturers);
  const coating = normalizeCoating(raw.coating, refs.coatings);

  const errors = [
    describe("ral", ral, raw.ral),
    describe("thickness", thickness, raw.thickness),
    describe("manufacturer", manufacturer, raw.manufacturer),
    describe("coating", coating, raw.coating),
  ].filter((message): message is string => message !== null);

  if (
    ral.status !== "ok" ||
    thickness.status !== "ok" ||
    manufacturer.status !== "ok" ||
    coating.status !== "ok"
  ) {
    return { status: "invalid", errors };
  }

  return {
    status: "valid",
    colorId: ral.record.id,
    thicknessId: thickness.record.id,
    manufacturerId: manufacturer.record.id,
    coatingId: coating.record.id,
  };
}
