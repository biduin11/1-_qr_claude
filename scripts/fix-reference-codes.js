/**
 * Одноразовое исправление `code` у уже существующих Manufacturer/Coating —
 * коды сейчас порядковые номера (артефакт первичного заполнения), нужны
 * человекочитаемые слаги по разделу 12 ТЗ, до передачи QR_CONTRACT.md
 * 1С-программисту. Обновляет только поле `code` по `id` найденной записи —
 * не пересоздаёт (не трогает `id`), поэтому уже созданные `Coil` не теряют
 * связь (внешний ключ — `manufacturerId`/`coatingId`, не `code`).
 *
 * Матчинг — по `displayName` (не по текущему числовому `code`, который
 * заранее неизвестен), с нормализацией (trim, схлопывание пробелов,
 * регистронезависимое сравнение) на случай мелких расхождений в написании.
 *
 * По умолчанию — сухой прогон (только печатает, что изменится). Реальная
 * запись — только с флагом --apply.
 *
 * Обычный JS, не TypeScript — запускается напрямую через `node`, без `tsx`
 * (devDependency, в prod-образе отсутствует и в рантайме тянулся бы из
 * npm-реестра). Использует уже сгенерированный Prisma Client напрямую,
 * тем же способом, что и scripts/assert-environment-guard.mjs.
 *
 * Использование:
 *   node scripts/fix-reference-codes.js             # сухой прогон
 *   node scripts/fix-reference-codes.js --apply      # применить
 */
import { PrismaClient } from "@prisma/client";

const MANUFACTURER_CODES = {
  "Северсталь": "SEVERSTAL",
  "НЛМК": "NLMK",
  "Dongbu Корея": "DONGBU_KOREA",
  "Seahsteel Корея": "SEAHSTEEL_KOREA",
  "Узбекистан": "UZBEKISTAN",
};

const COATING_CODES = {
  "Rooftop Бархат": "ROOFTOP_VELVET",
  "Ультразамша": "ULTRASUEDE",
  "Ультранубук": "ULTRANUBUK",
  "Ультракожа": "ULTRALEATHER",
  "Rooftop Шелк": "ROOFTOP_SILK",
  "Rooftop Шелк Мат": "ROOFTOP_SILK_MAT",
  "Стандарт/полиэстер": "POLYESTER",
};

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildNormalizedLookup(map) {
  const lookup = new Map();
  for (const [key, code] of Object.entries(map)) {
    lookup.set(normalize(key), { originalKey: key, code });
  }
  return lookup;
}

async function fixTable(label, records, codeMap, apply, updateCode) {
  console.log(`\n=== ${label} (сейчас в БД: ${records.length}) ===`);
  const lookup = buildNormalizedLookup(codeMap);
  const matchedKeys = new Set();

  for (const record of records) {
    const match = lookup.get(normalize(record.displayName));
    if (!match) {
      console.log(`  ? НЕ НАЙДЕНО соответствие для "${record.displayName}" (текущий code="${record.code}") — оставлено как есть`);
      continue;
    }
    matchedKeys.add(match.originalKey);

    if (record.code === match.code) {
      console.log(`  = "${record.displayName}": code уже "${match.code}", без изменений`);
      continue;
    }

    if (apply) {
      await updateCode(record.id, match.code);
      console.log(`  ✔ ОБНОВЛЕНО: "${record.displayName}": "${record.code}" -> "${match.code}"`);
    } else {
      console.log(`  → БУДЕТ ОБНОВЛЕНО (сухой прогон): "${record.displayName}": "${record.code}" -> "${match.code}"`);
    }
  }

  for (const key of Object.keys(codeMap)) {
    if (!matchedKeys.has(key)) {
      console.log(`  ! В списке ожидалось "${key}", но такой displayName в БД не найден — проверьте точное написание`);
    }
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();

  try {
    const manufacturers = await prisma.manufacturer.findMany({ orderBy: { displayName: "asc" } });
    await fixTable("Manufacturer", manufacturers, MANUFACTURER_CODES, apply, (id, code) =>
      prisma.manufacturer.update({ where: { id }, data: { code } }),
    );

    const coatings = await prisma.coating.findMany({ orderBy: { displayName: "asc" } });
    await fixTable("Coating", coatings, COATING_CODES, apply, (id, code) =>
      prisma.coating.update({ where: { id }, data: { code } }),
    );

    console.log("\n=== Thickness (только проверка — строкового code тут нет, значение = сама толщина в мм) ===");
    const thicknesses = await prisma.thickness.findMany({ orderBy: { valueHundredths: "asc" } });
    for (const t of thicknesses) {
      console.log(`  ${t.displayName} (valueHundredths=${t.valueHundredths} => ${(t.valueHundredths / 100).toFixed(2)} мм)`);
    }

    if (!apply) {
      console.log("\nСухой прогон завершён. Ничего не записано. Повторите с --apply, чтобы применить.");
    } else {
      console.log("\nГотово, изменения применены.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
