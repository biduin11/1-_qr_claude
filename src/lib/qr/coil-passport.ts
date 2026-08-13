import QRCode from "qrcode";

/**
 * Iteration 8 (раздел 15 ТЗ, паспорт рулона): QR печатается на этикетке рулона
 * и должен кодировать ровно то же самое, что принимает сканер рулона
 * (`parseCoilScanUrl`, ARCHITECTURE.md §10) — абсолютную ссылку на `/coil/:id`
 * собственного домена, ни параметров, ни query. `appUrl` — валидированный
 * `NEXT_PUBLIC_APP_URL` (src/lib/config.ts), не `Host`-заголовок запроса:
 * домен печатной этикетки должен быть детерминированным, а не зависеть от
 * того, с какого адреса админ в моменте открыл страницу печати.
 */
export function buildCoilPublicUrl(appUrl: string, coilId: string): string {
  return new URL(`/coil/${encodeURIComponent(coilId)}`, appUrl).toString();
}

/**
 * SVG (не PNG) — печатается векторно без потери резкости на любом DPI принтера,
 * и позволяет встроить QR прямо в SSR HTML страницы печати без отдельного
 * запроса/data URL. `errorCorrectionLevel: "H"` (30%, максимальный уровень
 * qrcode) — этикетка на рулоне в цеху подвержена загрязнению/бликам/заломам
 * сильнее, чем экран телефона.
 */
export async function generateCoilQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
  });
}
