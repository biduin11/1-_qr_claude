import { describe, expect, it } from "vitest";

import { isAdminPath, resolveDefaultTheme } from "@/components/theme/resolve-default-theme";

describe("isAdminPath", () => {
  it("распознаёт /admin и вложенные пути", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/")).toBe(true);
    expect(isAdminPath("/admin/coils")).toBe(true);
    expect(isAdminPath("/admin/login")).toBe(true);
    expect(isAdminPath("/admin/coils/abc123/print")).toBe(true);
  });

  it("не совпадает с похожими, но чужими путями (проверка границы)", () => {
    expect(isAdminPath("/administrator")).toBe(false);
    expect(isAdminPath("/administration")).toBe(false);
  });

  it("не совпадает с рабочими экранами", () => {
    expect(isAdminPath("/")).toBe(false);
    expect(isAdminPath("/check")).toBe(false);
    expect(isAdminPath("/coil/abc123")).toBe(false);
    expect(isAdminPath("/scan/coil")).toBe(false);
  });
});

describe("resolveDefaultTheme", () => {
  it("тёмная по умолчанию в admin — унаследованный вид, офисная работа за столом", () => {
    expect(resolveDefaultTheme("/admin")).toBe("dark");
    expect(resolveDefaultTheme("/admin/coils")).toBe("dark");
  });

  it("светлая по умолчанию везде вне admin — рабочие экраны на телефоне, вероятно яркое освещение", () => {
    expect(resolveDefaultTheme("/")).toBe("light");
    expect(resolveDefaultTheme("/check")).toBe("light");
    expect(resolveDefaultTheme("/coil/abc123")).toBe("light");
    expect(resolveDefaultTheme("/scan/invoice")).toBe("light");
  });
});
