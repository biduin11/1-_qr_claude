import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Независимая от NODE_ENV декларация физического окружения — сверяется с
  // EnvironmentGuard в БД при старте. См. ARCHITECTURE.md §11.1.
  APP_ENV: z.enum(["development", "production"]),
  DATABASE_URL: z.string().min(1, "DATABASE_URL обязателен"),
  SESSION_COOKIE_SECRET: z
    .string()
    .min(32, "SESSION_COOKIE_SECRET должен быть не короче 32 символов"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL должен быть корректным URL"),
});

export type AppConfig = z.infer<typeof envSchema>;

let cachedConfig: AppConfig | undefined;

/**
 * Валидирует переменные окружения при первом обращении и кэширует результат.
 * Падает с понятной ошибкой сразу, а не на первом запросе пользователя —
 * вызывается из instrumentation.ts при старте процесса.
 */
export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Некорректная конфигурация окружения:\n${issues}`);
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}
