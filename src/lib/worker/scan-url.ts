/**
 * Валидация содержимого отсканированного QR — раздел 8 ТЗ: сканер рулона
 * принимает только `/coil/:id`-паттерн своего домена, отклоняет `/check?...`
 * и произвольный текст. Симметрично для сканера накладной на /scan/invoice.
 * Чистые функции — origin передаётся параметром, не читается из window,
 * чтобы было тестируемо без DOM.
 */
export function parseCoilScanUrl(raw: string, origin: string): string | null {
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;

  const match = /^\/coil\/([^/]+)\/?$/.exec(url.pathname);
  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** Возвращает путь+query для навигации (сохраняя все 4 параметра) или null. */
export function parseCheckScanUrl(raw: string, origin: string): string | null {
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  if (url.pathname !== "/check") return null;

  return `${url.pathname}${url.search}`;
}
