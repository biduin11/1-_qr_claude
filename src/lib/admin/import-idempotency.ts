/**
 * In-memory кэш результатов /api/admin/import/confirm по idempotencyKey —
 * защита от повторной отправки того же запроса сетью/браузером/двойным
 * кликом (ARCHITECTURE.md §7, API_CONTRACT.md). Не путать с повторной
 * валидацией ссылок на справочники — это два разных механизма.
 *
 * Один инстанс приложения, как и rate-limit.ts — Redis не нужен для этого
 * объёма (единичные админ-импорты, не тысячи запросов в секунду).
 */
export type ImportConfirmResult = {
  imported: number;
  skipped: number;
  skippedRows: Array<{
    row: { colorId: string; thicknessId: string; manufacturerId: string; coatingId: string };
    reason: string;
  }>;
};

type CacheEntry = { result: ImportConfirmResult; expiresAt: number };

const TTL_MS = 60 * 60 * 1000;

const globalForImportCache = globalThis as unknown as {
  importIdempotencyCache?: Map<string, CacheEntry>;
};

const cache = globalForImportCache.importIdempotencyCache ?? new Map<string, CacheEntry>();
if (process.env.NODE_ENV !== "production") {
  globalForImportCache.importIdempotencyCache = cache;
}

export function getCachedImportResult(key: string): ImportConfirmResult | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.result;
}

export function setCachedImportResult(key: string, result: ImportConfirmResult): void {
  cache.set(key, { result, expiresAt: Date.now() + TTL_MS });
}

/** Только для тестов. */
export function resetImportIdempotencyCache(): void {
  cache.clear();
}
