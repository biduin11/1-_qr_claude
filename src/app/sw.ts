import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RouteHandlerCallbackOptions, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";

import { isAdminPath, isCheckPagePath, isCoilPagePath, isCoilVerdictApiPath } from "@/lib/pwa/sw-rules";

// Проект типизируется под lib "dom" (см. tsconfig.json), а не "webworker" —
// они конфликтуют при совместном включении, поэтому вместо полного
// ServiceWorkerGlobalScope здесь объявлен минимальный набор, который реально
// используется в этом файле (сам `Serwist.addEventListeners()` работает с
// `self` внутри собственного скомпилированного модуля, не через эти типы).
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

/**
 * ARCHITECTURE.md §9: `GET /api/coil/:id` решает МОЖНО/СТОП и обязан быть
 * строго network-only, без единого fallback на кэш — даже при таймауте сети.
 * Правило должно стоять раньше общего `/api/*`-правила из `defaultCache`
 * (там `NetworkFirst` с кэш-фоллбэком) — в serwist/workbox побеждает первое
 * совпадение по порядку в `runtimeCaching`.
 */
const coilApiNetworkOnly: RuntimeCaching = {
  matcher: ({ sameOrigin, url }) => sameOrigin && isCoilVerdictApiPath(url.pathname),
  method: "GET",
  handler: new NetworkOnly(),
};

/**
 * Сама страница `/coil/:id` (не только API) — тоже NetworkOnly. См.
 * `isCoilPagePath` в `src/lib/pwa/sw-rules.ts` за обоснованием: это не
 * решение "на всякий случай", а прямой фикс реального сбоя навигации на
 * iOS Safari сразу после сканирования (Decision Log ARCHITECTURE.md §15,
 * запись от 2026-08-14). Плата за это — офлайн-доступ к уже открытой
 * read-only карточке рулона (ARCHITECTURE.md §9) больше не работает; решение
 * сознательно принято в пользу надёжности основного сценария (скан → вердикт)
 * важнее редкого офлайн-повторного просмотра карточки.
 */
const coilPageNetworkOnly: RuntimeCaching = {
  matcher: ({ sameOrigin, url }) => sameOrigin && isCoilPagePath(url.pathname),
  method: "GET",
  handler: new NetworkOnly(),
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `NetworkFirst` из serwist делает РОВНО одну попытку сети: если она падает
 * и в кэше нет записи — бросает исключение (см. JSDoc класса в
 * node_modules/serwist: "If the network request fails, and there is no
 * cache match, this will throw"). Для большинства страниц это не проблема —
 * они уже открывались раньше, кэш есть. Но `/check` почти всегда открывается
 * ВПЕРВЫЕ именно с этими query-параметрами (у каждой накладной свои,
 * QR из 1С не переиспользует URL), то есть кэша заведомо нет —
 * единственный сетевой сбой сразу превращается в голую ошибку браузера
 * ("This page couldn't load") вместо экрана приложения. Тот же класс бага,
 * что был у `/coil/:id` (ARCHITECTURE.md §15, запись от 2026-08-14), но
 * NetworkOnly здесь не подходит — раздел 39 ТЗ требует, чтобы `/check`
 * оставался доступен офлайн по кэшированным справочникам. Вместо этого —
 * до 3 попыток сети (с паузой между ними) перед тем, как разрешить обычному
 * NetworkFirst откатиться в кэш на последней попытке. Если реально офлайн и
 * кэш для этого URL уже есть — он отдаётся сразу на 1-й попытке, ретраи не
 * нужны и не задействуются.
 */
async function checkPageNetworkFirstWithRetry(options: RouteHandlerCallbackOptions): Promise<Response> {
  const strategy = new NetworkFirst({
    // Тот же кэш, что и общее HTML-навигационное правило ниже (PAGES_CACHE_NAME.html
    // в @serwist/next/worker) — /check не должен жить в отдельном кэше от
    // остальных страниц.
    cacheName: "pages",
    plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 1440 * 60 })],
    networkTimeoutSeconds: 4,
  });

  const ATTEMPTS = 3;
  const RETRY_DELAY_MS = 400;
  let lastError: unknown;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await delay(RETRY_DELAY_MS);
    }
    try {
      return await strategy.handle(options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

const checkPageResilient: RuntimeCaching = {
  matcher: ({ sameOrigin, url }) => sameOrigin && isCheckPagePath(url.pathname),
  method: "GET",
  handler: checkPageNetworkFirstWithRetry,
};

/**
 * `/admin/*` и `/api/admin/*` целиком — network-only. Обоснование в
 * `isAdminPath` (src/lib/pwa/sw-rules.ts): без этого правила редиректы
 * `redirect()` из `(protected)/layout.tsx`/`/admin/login` попадают под
 * `NetworkFirst` из `defaultCache`, которая падает на `opaqueredirect`-ответе
 * с `SerwistError("no-response")` — реальный сбой навигации в production,
 * не гипотетический.
 */
const adminNetworkOnly: RuntimeCaching = {
  matcher: ({ sameOrigin, url }) => sameOrigin && isAdminPath(url.pathname),
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Остальное (app shell: JS/CSS/шрифты/иконки — CacheFirst; HTML-навигация
  // и т.п.) — это `defaultCache` из `@serwist/next/worker`, штатный набор
  // стратегий под Next.js. Отдельного публичного API для справочников
  // (Color/Thickness/Manufacturer/Coating) в проекте нет — `/check`
  // разрешает их server-side и встраивает в SSR-HTML (Iteration 5), поэтому
  // кэш HTML-навигации `/check` (через `checkPageResilient` выше, не общее
  // правило `defaultCache` — см. его комментарий) уже покрывает офлайн-
  // требование "справочники доступны офлайн" без отдельного JSON-эндпоинта
  // (см. Decision Log, запись Iteration 7).
  runtimeCaching: [coilApiNetworkOnly, coilPageNetworkOnly, checkPageResilient, adminNetworkOnly, ...defaultCache],
});

serwist.addEventListeners();
