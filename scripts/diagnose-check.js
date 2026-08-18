/**
 * Только чтение — ничего не пишет в БД. Диагностика бага "/check показывает
 * «неизвестное значение» для RAL 7024 / 0.5 / nlmk / polyester":
 * печатает ПОЛНОЕ содержимое всех 4 справочников (id/код/displayName/active)
 * и явно проверяет, что нашлось бы для конкретных значений из проблемного
 * запроса — теми же правилами сравнения, что и normalizeRal/normalizeByAlias
 * в src/lib/material-normalization.ts (точное совпадение по code, регистро-
 * независимое по code/aliases у производителя и покрытия).
 *
 * Обычный JS, без tsx (см. комментарий в scripts/fix-reference-codes.js).
 *
 * Использование:
 *   node scripts/diagnose-check.js
 */
import { PrismaClient } from "@prisma/client";

const TEST = { ral: "7024", thicknessMm: 0.5, manufacturer: "nlmk", coating: "polyester" };

function printTable(label, rows, formatRow) {
  console.log(`\n=== ${label} (${rows.length}) ===`);
  if (rows.length === 0) {
    console.log("  (пусто)");
    return;
  }
  for (const row of rows) {
    console.log("  " + formatRow(row));
  }
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const [colors, thicknesses, manufacturers, coatings] = await Promise.all([
      prisma.color.findMany({ orderBy: { code: "asc" } }),
      prisma.thickness.findMany({ orderBy: { valueHundredths: "asc" } }),
      prisma.manufacturer.findMany({ orderBy: { displayName: "asc" } }),
      prisma.coating.findMany({ orderBy: { displayName: "asc" } }),
    ]);

    printTable("Color", colors, (c) => `code="${c.code}" displayName="${c.displayName}" active=${c.active} id=${c.id}`);
    printTable(
      "Thickness",
      thicknesses,
      (t) => `valueHundredths=${t.valueHundredths} (${(t.valueHundredths / 100).toFixed(2)} мм) displayName="${t.displayName}" active=${t.active} id=${t.id}`,
    );
    printTable(
      "Manufacturer",
      manufacturers,
      (m) => `code="${m.code}" displayName="${m.displayName}" aliases=${JSON.stringify(m.aliases)} active=${m.active} id=${m.id}`,
    );
    printTable(
      "Coating",
      coatings,
      (c) => `code="${c.code}" displayName="${c.displayName}" aliases=${JSON.stringify(c.aliases)} active=${c.active} id=${c.id}`,
    );

    console.log("\n=== Что нашлось бы для проблемного запроса (ral=7024, thickness=0.5, manufacturer=nlmk, coating=polyester) ===");

    const ralMatch = colors.find((c) => c.code === TEST.ral);
    console.log(
      ralMatch
        ? `  RAL "${TEST.ral}": НАЙДЕН, active=${ralMatch.active}${!ralMatch.active ? " <-- деактивирован, это и есть причина" : ""}`
        : `  RAL "${TEST.ral}": НЕ НАЙДЕН ни один Color с таким code — вот причина "неизвестное значение"`,
    );

    const targetHundredths = Math.round(TEST.thicknessMm * 100);
    const thicknessMatch = thicknesses.find((t) => t.valueHundredths === targetHundredths);
    console.log(
      thicknessMatch
        ? `  Толщина ${TEST.thicknessMm}: НАЙДЕНА, active=${thicknessMatch.active}${!thicknessMatch.active ? " <-- деактивирована" : ""}`
        : `  Толщина ${TEST.thicknessMm}: НЕ НАЙДЕНА (valueHundredths=${targetHundredths} ни у одной записи)`,
    );

    const cleanedManufacturer = TEST.manufacturer.toLowerCase();
    const manufacturerMatch = manufacturers.find(
      (m) => m.code.toLowerCase() === cleanedManufacturer || m.aliases.some((a) => a.toLowerCase() === cleanedManufacturer),
    );
    console.log(
      manufacturerMatch
        ? `  Производитель "${TEST.manufacturer}": НАЙДЕН (${manufacturerMatch.displayName}, code="${manufacturerMatch.code}"), active=${manufacturerMatch.active}${!manufacturerMatch.active ? " <-- деактивирован" : ""}`
        : `  Производитель "${TEST.manufacturer}": НЕ НАЙДЕН ни по code, ни по aliases ни у одной записи`,
    );

    const cleanedCoating = TEST.coating.toLowerCase();
    const coatingMatch = coatings.find(
      (c) => c.code.toLowerCase() === cleanedCoating || c.aliases.some((a) => a.toLowerCase() === cleanedCoating),
    );
    console.log(
      coatingMatch
        ? `  Покрытие "${TEST.coating}": НАЙДЕНО (${coatingMatch.displayName}, code="${coatingMatch.code}"), active=${coatingMatch.active}${!coatingMatch.active ? " <-- деактивировано" : ""}`
        : `  Покрытие "${TEST.coating}": НЕ НАЙДЕНО ни по code, ни по aliases ни у одной записи`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
