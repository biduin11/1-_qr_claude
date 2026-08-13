import jsQR from "jsqr";
import { PNG } from "pngjs";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";

import { buildCoilPublicUrl, generateCoilQrSvg } from "@/lib/qr/coil-passport";
import { parseCoilScanUrl } from "@/lib/worker/scan-url";

const appUrl = "https://kontrol-metalla.example.ru";

describe("buildCoilPublicUrl", () => {
  it("собирает абсолютную ссылку на /coil/:id на заданном домене", () => {
    expect(buildCoilPublicUrl(appUrl, "abc123")).toBe(`${appUrl}/coil/abc123`);
  });

  it("экранирует id, чтобы не сломать URL спецсимволами", () => {
    expect(buildCoilPublicUrl(appUrl, "a/b c")).toBe(`${appUrl}/coil/a%2Fb%20c`);
  });

  it("результат принимается тем же сканером, что и отсканированный на телефоне QR (симметрия печать/сканирование)", () => {
    const url = buildCoilPublicUrl(appUrl, "cln1a2b3c4d5e6f7g8h9i0j1");
    expect(parseCoilScanUrl(url, appUrl)).toBe("cln1a2b3c4d5e6f7g8h9i0j1");
  });
});

describe("generateCoilQrSvg", () => {
  it("возвращает валидный SVG-документ", async () => {
    const svg = await generateCoilQrSvg(buildCoilPublicUrl(appUrl, "abc123"));
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("разные id дают разный SVG (не заглушка/кэш одного и того же кода)", async () => {
    const svgA = await generateCoilQrSvg(buildCoilPublicUrl(appUrl, "coil-a"));
    const svgB = await generateCoilQrSvg(buildCoilPublicUrl(appUrl, "coil-b"));
    expect(svgA).not.toBe(svgB);
  });
});

describe("напечатанный QR действительно раскодируется обратно (Iteration 8, exit-критерий раздела 15 ТЗ)", () => {
  /**
   * SVG-рендерер `qrcode` и его PNG-рендерер используют один и тот же
   * встроенный движок кодирования (`lib/renderer/*` в пакете qrcode) — модули
   * (тёмные/светлые клетки) идентичны в обоих форматах, различается только
   * то, как эти модули превращаются в пиксели/векторные пути. Раскодировать
   * произведённый нами SVG напрямую нечем без headless-браузера/rasterizer'а
   * (среда разработки без браузерной автоматизации — см. ARCHITECTURE.md §9,
   * §10), поэтому для реального round-trip through decoding здесь
   * используется PNG того же движка через `QRCode.toBuffer` — это честная
   * проверка того, что кодировщик кодирует именно ту ссылку, которую ожидает
   * сканер, а не проверка самого SVG-файла попиксельно.
   */
  it("QR PNG того же URL, что и в паспорте, раскодируется в исходную ссылку и проходит parseCoilScanUrl", async () => {
    const url = buildCoilPublicUrl(appUrl, "cln1a2b3c4d5e6f7g8h9i0j1");

    const pngBuffer = await QRCode.toBuffer(url, { errorCorrectionLevel: "H", margin: 2, scale: 6 });
    const png = PNG.sync.read(pngBuffer);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

    expect(decoded?.data).toBe(url);
    expect(parseCoilScanUrl(decoded?.data ?? "", appUrl)).toBe("cln1a2b3c4d5e6f7g8h9i0j1");
  });
});
