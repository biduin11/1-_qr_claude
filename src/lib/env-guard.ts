import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * Сверяет APP_ENV процесса с маркером EnvironmentGuard, физически хранящимся
 * в БД, на которую указывает DATABASE_URL. Только читает — никогда не создаёт
 * и не изменяет запись (это отдельно делает prisma/seed.ts, осознанно и
 * вручную при подготовке инстанса). См. ARCHITECTURE.md §11.1.
 *
 * При несовпадении или отсутствии маркера — бросает исключение и тем самым
 * останавливает старт процесса. Вызывается из instrumentation.ts.
 */
export async function assertEnvironmentGuard(): Promise<void> {
  const config = getConfig();

  const guard = await prisma.environmentGuard.findUnique({ where: { id: 1 } });

  if (!guard) {
    throw new Error(
      `EnvironmentGuard не найден в БД. Перед первым запуском приложения на новом инстансе ` +
        `нужно один раз вручную выполнить "npm run db:seed" с корректным APP_ENV, чтобы ` +
        `промаркировать эту БД (см. ARCHITECTURE.md §11.1). Отказываюсь стартовать с ` +
        `APP_ENV="${config.APP_ENV}" против непромаркированной базы.`,
    );
  }

  if (guard.env !== config.APP_ENV) {
    throw new Error(
      `EnvironmentGuard: несовпадение окружений. БД промаркирована как env="${guard.env}", ` +
        `но процесс запущен с APP_ENV="${config.APP_ENV}". Отказываюсь стартовать — похоже на ` +
        `перепутанный DATABASE_URL между dev и prod (см. ARCHITECTURE.md §11.1).`,
    );
  }

  logger.info("EnvironmentGuard: проверка пройдена", { env: guard.env });
}
