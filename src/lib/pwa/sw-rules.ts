/**
 * Чистая логика маршрутизации service worker (ARCHITECTURE.md §9), вынесена
 * из `src/app/sw.ts` отдельно, чтобы её можно было покрыть unit-тестом без
 * браузерных API (Cache/ServiceWorker) — сам `sw.ts` тестируется только
 * вручную на реальном устройстве (см. DEVELOPMENT_PLAN.md Iteration 7).
 */
export function isCoilVerdictApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/coil/");
}
