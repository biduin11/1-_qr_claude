// Изолированная, минимальная проверка EnvironmentGuard для production entrypoint
// (docker/entrypoint.sh) — запускается ДО `prisma migrate deploy`, на голом node,
// без загрузки Next.js. Обоснование и полная схема — ARCHITECTURE.md §11.1.
//
// Только читает — никогда не создаёт запись. Создание/маркировка — осознанный
// ручной шаг через `npm run db:seed` при подготовке нового инстанса.
import { PrismaClient } from "@prisma/client";

const appEnv = process.env.APP_ENV;

if (appEnv !== "development" && appEnv !== "production") {
  console.error(
    `[env-guard] APP_ENV должен быть "development" или "production", получено: ${JSON.stringify(appEnv)}`,
  );
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const guard = await prisma.environmentGuard.findUnique({ where: { id: 1 } });

  if (!guard) {
    console.error(
      "[env-guard] EnvironmentGuard не найден в БД. Перед первым деплоем на новый инстанс " +
        'нужно один раз вручную выполнить "npm run db:seed" с корректным APP_ENV ' +
        "(см. ARCHITECTURE.md §11.1). Отказываюсь продолжать деплой.",
    );
    process.exit(1);
  }

  if (guard.env !== appEnv) {
    console.error(
      `[env-guard] Несовпадение окружений: БД промаркирована env="${guard.env}", ` +
        `а деплой запущен с APP_ENV="${appEnv}". Похоже на перепутанный DATABASE_URL ` +
        "между dev и prod. Отказываюсь продолжать деплой (см. ARCHITECTURE.md §11.1).",
    );
    process.exit(1);
  }

  console.log(`[env-guard] Проверка пройдена: env="${guard.env}"`);
} catch (error) {
  console.error("[env-guard] Не удалось проверить EnvironmentGuard:", error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
