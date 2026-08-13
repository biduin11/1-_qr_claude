/**
 * In-memory rate limiting для /api/admin/login (ARCHITECTURE.md §8) — один
 * инстанс приложения, Redis не нужен. Фиксированное окно на ключ
 * (IP + логин), чтобы не давать перебирать пароль конкретного аккаунта и не
 * штрафовать всех подряд за чужие попытки с той же сети.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Bucket = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as { loginAttemptBuckets?: Map<string, Bucket> };

const buckets = globalForRateLimit.loginAttemptBuckets ?? new Map<string, Bucket>();
if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.loginAttemptBuckets = buckets;
}

/** true — попытка разрешена (и засчитана). false — превышен лимит. */
export function checkLoginRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/** Только для тестов — сбрасывает состояние между сценариями. */
export function resetLoginRateLimit(): void {
  buckets.clear();
}
