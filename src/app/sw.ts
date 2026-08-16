import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

import { isCoilPagePath, isCoilVerdictApiPath } from "@/lib/pwa/sw-rules";

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

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Остальное (app shell: JS/CSS/шрифты/иконки — CacheFirst; HTML-навигация
  // `/`, `/check` и т.п. — NetworkFirst с кэш-фоллбэком) — это `defaultCache`
  // из `@serwist/next/worker`, штатный набор стратегий под Next.js.
  // Отдельного публичного API для справочников (Color/Thickness/
  // Manufacturer/Coating) в проекте нет — `/check` разрешает их server-side
  // и встраивает в SSR-HTML (Iteration 5), поэтому кэш HTML-навигации
  // `/check` уже покрывает офлайн-требование "справочники доступны офлайн"
  // без отдельного JSON-эндпоинта (см. Decision Log, запись Iteration 7).
  runtimeCaching: [coilApiNetworkOnly, coilPageNetworkOnly, ...defaultCache],
});

serwist.addEventListeners();
