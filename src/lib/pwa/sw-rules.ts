/**
 * Чистая логика маршрутизации service worker (ARCHITECTURE.md §9), вынесена
 * из `src/app/sw.ts` отдельно, чтобы её можно было покрыть unit-тестом без
 * браузерных API (Cache/ServiceWorker) — сам `sw.ts` тестируется только
 * вручную на реальном устройстве (см. DEVELOPMENT_PLAN.md Iteration 7).
 */
export function isCoilVerdictApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/coil/");
}

/**
 * Страница `/coil/:id` — та же логика паттерна, что и `parseCoilScanUrl`
 * (src/lib/worker/scan-url.ts), чтобы не зацепить что-то постороннее.
 * NetworkOnly для неё выбран не из соображений устаревших данных (вердикт
 * МОЖНО/СТОП и так всегда считается отдельным no-store фетчем на
 * /api/coil/:id, независимо от того, кэширован ли сам HTML — ARCHITECTURE.md
 * §2/§9), а из-за реального сбоя на iOS Safari: первая навигация на ранее не
 * посещённый /coil/:id после сканирования иногда обрывалась с "This page
 * couldn't load" — у NetworkFirst (дефолтная стратегия @serwist/next/worker
 * для HTML-навигаций) нет кэш-фоллбэка при первом визите, и единственный
 * сетевой сбой не прощается. См. Decision Log ARCHITECTURE.md §15, запись от
 * 2026-08-14.
 */
export function isCoilPagePath(pathname: string): boolean {
  return /^\/coil\/[^/]+\/?$/.test(pathname);
}

/**
 * Страница `/check` — не сама по себе network-only (см. `checkPageResilient`
 * в `src/app/sw.ts`), но матчер для неё нужен отдельно от общего
 * HTML-навигационного правила `defaultCache`, чтобы поставить перед ним
 * правило с ретраями. Раздел 39 ТЗ требует офлайн-доступ к /check по
 * кэшированным справочникам — NetworkOnly (как у /coil/:id) здесь не
 * подходит принципиально, не просто "ещё не сделали".
 */
export function isCheckPagePath(pathname: string): boolean {
  return /^\/check\/?$/.test(pathname);
}

/**
 * Весь admin-раздел (`/admin/*` и `/api/admin/*`) — тоже network-only, но по
 * другой причине, чем `/coil/:id`: не устаревшие данные, а сбой самого
 * механизма кэша. `(protected)/layout.tsx` и `/admin/login` завязаны на
 * `redirect()` (307) — а `Content-Type`-матчер `defaultCache` для HTML-
 * навигаций не совпадает у ответа без тела, поэтому редирект попадал под
 * общее правило `others` (`NetworkFirst`). Для навигационных (`mode:
 * "navigate"`) запросов `request.redirect` браузер принудительно выставляет
 * в `"manual"` (см. ссылку на https://github.com/GoogleChrome/workbox/issues/1796
 * в самом serwist, node_modules/serwist/src/lib/strategies/StrategyHandler.ts) —
 * сервер отвечает 307, `fetch()` внутри service worker получает ответ типа
 * `"opaqueredirect"`, а `Cache.prototype.put()` по спеке кидает `TypeError`
 * на такой ответ. `NetworkFirst.fetchAndCachePut` ловит эту ошибку, откатывается
 * на `cacheMatch` — а кэша ещё нет (первый визит) — и в итоге бросает
 * `SerwistError("no-response")`, что и ловится `src/app/error.tsx`/
 * `global-error.tsx` как "Что-то пошло не так" при любом заходе на
 * `/admin/login` уже залогиненным или на защищённую страницу разлогиненным.
 * NetworkOnly не пытается кэшировать ответ вообще — `opaqueredirect`
 * передаётся напрямую в `respondWith()`, браузер сам выполняет редирект как
 * обычно. Заодно это и правильно по сути: admin — авторизованный
 * динамический раздел без офлайн-требования (не как `/check`), кэшировать
 * его страницы/API service worker'ом в принципе не нужно.
 */
export function isAdminPath(pathname: string): boolean {
  // startsWith("/admin") без разделителя ловил бы и /administration — те же
  // грабли, от которых isCoilVerdictApiPath защищается через "/api/coil/".
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");
}
