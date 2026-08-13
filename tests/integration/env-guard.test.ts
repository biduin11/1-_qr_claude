/**
 * Интеграционный тест EnvironmentGuard (ARCHITECTURE.md §11.1).
 *
 * Требует реально доступный PostgreSQL по DATABASE_URL (не мокается) —
 * это сознательное решение: сам смысл проверки в том, что она бьёт по
 * настоящей БД, а мок этой гарантии не даёт. Запускать против dev-инстанса
 * из docker-compose.dev.yml:
 *
 *   docker compose -f docker-compose.dev.yml up -d db
 *   DATABASE_URL=postgresql://kontrol_metalla:kontrol_metalla_dev@localhost:5432/kontrol_metalla npm run test:integration
 *
 * Не входит в `npm test` (unit) и не должен запускаться без поднятой БД —
 * поэтому лежит отдельно от tests/unit и гоняется через test:integration.
 *
 * ВАЖНО: тест очищает таблицу EnvironmentGuard (beforeEach/afterAll) на той
 * БД, что указана в DATABASE_URL. Если это shared dev-инстанс, на котором
 * уже стоит "боевая" для разработки маркировка (env=development) — после
 * прогона нужно заново `npm run db:seed`, иначе стек из
 * docker-compose.dev.yml откажется стартовать (это и есть ожидаемое
 * поведение guard'а, не баг теста, но об этом стоит помнить).
 */
import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const baseEnv = {
  NODE_ENV: "test",
  SESSION_COOKIE_SECRET: "a".repeat(32),
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
} as const;

const setupPrisma = new PrismaClient();
const originalEnv = process.env;

describe("assertEnvironmentGuard (интеграционный, требует реальный Postgres)", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL не задан. Этот тест бьёт по настоящей БД — поднимите dev Postgres " +
          "(docker compose -f docker-compose.dev.yml up -d db) и передайте DATABASE_URL. " +
          "См. заголовок файла.",
      );
    }
    // Санити-чек, что EnvironmentGuard вообще существует как таблица (миграции применены).
    await setupPrisma.$queryRaw`SELECT 1`;
  });

  beforeEach(async () => {
    await setupPrisma.environmentGuard.deleteMany();
    vi.resetModules();
    process.env = { ...originalEnv, ...baseEnv, DATABASE_URL: originalEnv.DATABASE_URL };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(async () => {
    await setupPrisma.environmentGuard.deleteMany();
    await setupPrisma.$disconnect();
  });

  it("бросает ошибку, если EnvironmentGuard отсутствует в БД", async () => {
    process.env.APP_ENV = "development";
    const { assertEnvironmentGuard } = await import("@/lib/env-guard");
    await expect(assertEnvironmentGuard()).rejects.toThrow(/EnvironmentGuard не найден/);
  });

  it("проходит без ошибок, когда APP_ENV совпадает с маркером в БД", async () => {
    await setupPrisma.environmentGuard.create({ data: { id: 1, env: "development" } });
    process.env.APP_ENV = "development";
    const { assertEnvironmentGuard } = await import("@/lib/env-guard");
    await expect(assertEnvironmentGuard()).resolves.toBeUndefined();
  });

  it("бросает ошибку при несовпадении APP_ENV и маркера в БД (dev/prod mix-up)", async () => {
    await setupPrisma.environmentGuard.create({ data: { id: 1, env: "development" } });
    process.env.APP_ENV = "production";
    const { assertEnvironmentGuard } = await import("@/lib/env-guard");
    await expect(assertEnvironmentGuard()).rejects.toThrow(/несовпадение окружений/i);
  });

  it("бросает ошибку в обратную сторону (маркер production, APP_ENV development)", async () => {
    await setupPrisma.environmentGuard.create({ data: { id: 1, env: "production" } });
    process.env.APP_ENV = "development";
    const { assertEnvironmentGuard } = await import("@/lib/env-guard");
    await expect(assertEnvironmentGuard()).rejects.toThrow(/несовпадение окружений/i);
  });
});
