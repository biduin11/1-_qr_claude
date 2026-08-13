import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Только для локальной разработки — см. seedDevAdmin(). Не используется в prod.
const DEV_ADMIN_USERNAME = "admin";
const DEV_ADMIN_PASSWORD = "dev-only-admin-password";

/**
 * Ставит маркер EnvironmentGuard (ARCHITECTURE.md §11.1), если его ещё нет.
 * Если маркер уже есть и не совпадает с APP_ENV — падаем с ошибкой, а не
 * молча перезаписываем: это защита от повторного запуска seed с неверным
 * APP_ENV поверх уже промаркированной базы (например, prod).
 */
async function ensureEnvironmentGuard(): Promise<void> {
  const appEnv = process.env.APP_ENV;
  if (appEnv !== "development" && appEnv !== "production") {
    throw new Error(
      `APP_ENV должен быть "development" или "production", получено: ${JSON.stringify(appEnv)}`,
    );
  }

  const existing = await prisma.environmentGuard.findUnique({ where: { id: 1 } });

  if (!existing) {
    await prisma.environmentGuard.create({ data: { id: 1, env: appEnv } });
    console.log(`[seed] EnvironmentGuard создан: env="${appEnv}"`);
    return;
  }

  if (existing.env !== appEnv) {
    throw new Error(
      `[seed] EnvironmentGuard уже помечен как env="${existing.env}", но APP_ENV="${appEnv}". ` +
        `Отказываюсь молча перемаркировать базу — похоже на попытку запустить seed не того окружения ` +
        `на уже промаркированной БД (см. ARCHITECTURE.md §11.1).`,
    );
  }

  console.log(`[seed] EnvironmentGuard уже соответствует env="${appEnv}", пропускаю`);
}

/** Минимальные справочные данные для разработки — идемпотентно (upsert по code). */
async function seedReferenceData(): Promise<void> {
  const colors = [
    { code: "7024", displayName: "RAL 7024" },
    { code: "9003", displayName: "RAL 9003" },
  ];
  for (const color of colors) {
    await prisma.color.upsert({
      where: { code: color.code },
      update: { displayName: color.displayName },
      create: color,
    });
  }

  const thicknesses = [
    { valueHundredths: 45, displayName: "0,45 мм" },
    { valueHundredths: 50, displayName: "0,50 мм" },
  ];
  for (const thickness of thicknesses) {
    await prisma.thickness.upsert({
      where: { valueHundredths: thickness.valueHundredths },
      update: { displayName: thickness.displayName },
      create: thickness,
    });
  }

  const manufacturers = [
    { code: "UZBEKISTAN", displayName: "Узбекистан", aliases: ["uzbekistan"] },
    { code: "SEVERSTAL", displayName: "Северсталь", aliases: ["severstal"] },
  ];
  for (const manufacturer of manufacturers) {
    await prisma.manufacturer.upsert({
      where: { code: manufacturer.code },
      update: { displayName: manufacturer.displayName, aliases: manufacturer.aliases },
      create: manufacturer,
    });
  }

  const coatings = [
    { code: "VIKING", displayName: "Viking", aliases: ["viking"] },
    { code: "MATTE", displayName: "Matte", aliases: ["matte"] },
  ];
  for (const coating of coatings) {
    await prisma.coating.upsert({
      where: { code: coating.code },
      update: { displayName: coating.displayName, aliases: coating.aliases },
      create: coating,
    });
  }

  console.log("[seed] Справочные данные для разработки готовы");
}

/**
 * Создаёт учётку админа для локальной разработки, если её ещё нет — только
 * когда APP_ENV=development. Никогда не запускается против prod-БД (см.
 * ensureEnvironmentGuard выше: prod-инстанс промаркирован env="production",
 * и main() ниже даже не вызывает эту функцию при APP_ENV!=="development").
 * Для prod/staging использовать scripts/create-admin.ts.
 */
async function seedDevAdmin(): Promise<void> {
  const existing = await prisma.adminUser.findUnique({ where: { username: DEV_ADMIN_USERNAME } });
  if (existing) {
    console.log(`[seed] Dev-администратор "${DEV_ADMIN_USERNAME}" уже существует, пропускаю`);
    return;
  }

  const passwordHash = await hash(DEV_ADMIN_PASSWORD);
  await prisma.adminUser.create({
    data: { username: DEV_ADMIN_USERNAME, passwordHash },
  });
  console.log(
    `[seed] Dev-администратор создан: username="${DEV_ADMIN_USERNAME}", ` +
      `password="${DEV_ADMIN_PASSWORD}" (только для разработки, не использовать в prod)`,
  );
}

async function main(): Promise<void> {
  await ensureEnvironmentGuard();
  await seedReferenceData();
  if (process.env.APP_ENV === "development") {
    await seedDevAdmin();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
