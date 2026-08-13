import { describe, expect, it } from "vitest";

import { parseCheckScanUrl, parseCoilScanUrl } from "@/lib/worker/scan-url";

const origin = "https://kontrol-metalla.example.ru";

describe("parseCoilScanUrl", () => {
  it("принимает корректный /coil/:id на своём домене", () => {
    expect(parseCoilScanUrl(`${origin}/coil/abc123`, origin)).toBe("abc123");
  });

  it("принимает относительный путь (на случай если сканер отдаёт путь без домена)", () => {
    expect(parseCoilScanUrl("/coil/abc123", origin)).toBe("abc123");
  });

  it("отклоняет посторонний домен (раздел 8 ТЗ, пункт 9 чек-листа)", () => {
    expect(parseCoilScanUrl("https://evil.example.com/coil/abc123", origin)).toBeNull();
  });

  it("отклоняет /check?... отсканированный по ошибке в сканере рулона", () => {
    expect(
      parseCoilScanUrl(`${origin}/check?ral=7024&thickness=0.50&manufacturer=uzbekistan&coating=viking`, origin),
    ).toBeNull();
  });

  it("отклоняет произвольный текст, не являющийся URL", () => {
    expect(parseCoilScanUrl("просто какой-то текст в QR", origin)).toBeNull();
  });

  it("отклоняет путь другого раздела приложения", () => {
    expect(parseCoilScanUrl(`${origin}/admin/coils`, origin)).toBeNull();
  });

  it("отклоняет вложенный путь под /coil/", () => {
    expect(parseCoilScanUrl(`${origin}/coil/abc123/extra`, origin)).toBeNull();
  });

  it("декодирует URL-кодированный id", () => {
    expect(parseCoilScanUrl(`${origin}/coil/abc%20123`, origin)).toBe("abc 123");
  });
});

describe("parseCheckScanUrl", () => {
  it("принимает /check с параметрами на своём домене и сохраняет query", () => {
    const raw = `${origin}/check?ral=7024&thickness=0.50&manufacturer=uzbekistan&coating=viking`;
    expect(parseCheckScanUrl(raw, origin)).toBe(
      "/check?ral=7024&thickness=0.50&manufacturer=uzbekistan&coating=viking",
    );
  });

  it("отклоняет посторонний домен", () => {
    expect(parseCheckScanUrl("https://evil.example.com/check?ral=7024", origin)).toBeNull();
  });

  it("отклоняет /coil/:id, отсканированный в сканере накладной", () => {
    expect(parseCheckScanUrl(`${origin}/coil/abc123`, origin)).toBeNull();
  });

  it("отклоняет произвольный текст", () => {
    expect(parseCheckScanUrl("не ссылка вообще", origin)).toBeNull();
  });
});
