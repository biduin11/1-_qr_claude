import { describe, expect, it } from "vitest";

import { isCheckPagePath, isCoilPagePath, isCoilVerdictApiPath } from "@/lib/pwa/sw-rules";

describe("isCoilVerdictApiPath", () => {
  it("распознаёт /api/coil/:id — маршрут, который service worker обязан отдавать строго network-only (ARCHITECTURE.md §9)", () => {
    expect(isCoilVerdictApiPath("/api/coil/abc123")).toBe(true);
  });

  it("не совпадает с соседними /api/*-путями — они не должны случайно попасть под то же правило", () => {
    expect(isCoilVerdictApiPath("/api/health")).toBe(false);
    expect(isCoilVerdictApiPath("/api/admin/coils")).toBe(false);
    expect(isCoilVerdictApiPath("/api/coils")).toBe(false);
  });

  it("не совпадает со страницей /coil/:id (HTML, а не API) — у неё своё правило, isCoilPagePath", () => {
    expect(isCoilVerdictApiPath("/coil/abc123")).toBe(false);
  });
});

describe("isCoilPagePath", () => {
  it("распознаёт саму страницу /coil/:id — тоже network-only, не только API (ARCHITECTURE.md §9, найдено при реальном сбое навигации на iOS)", () => {
    expect(isCoilPagePath("/coil/abc123")).toBe(true);
  });

  it("допускает завершающий слэш — тот же паттерн, что у parseCoilScanUrl", () => {
    expect(isCoilPagePath("/coil/abc123/")).toBe(true);
  });

  it("не совпадает с /api/coil/:id — у той свой матчер (не задваиваем правило)", () => {
    expect(isCoilPagePath("/api/coil/abc123")).toBe(false);
  });

  it("не совпадает с соседними страницами", () => {
    expect(isCoilPagePath("/scan/coil")).toBe(false);
    expect(isCoilPagePath("/coil")).toBe(false);
    expect(isCoilPagePath("/check")).toBe(false);
  });
});

describe("isCheckPagePath", () => {
  it("распознаёт /check — почти каждый визит первый (у каждой накладной свои query-параметры), поэтому кэш заведомо пуст", () => {
    expect(isCheckPagePath("/check")).toBe(true);
  });

  it("допускает завершающий слэш", () => {
    expect(isCheckPagePath("/check/")).toBe(true);
  });

  it("не совпадает с соседними путями", () => {
    expect(isCheckPagePath("/coil/abc123")).toBe(false);
    expect(isCheckPagePath("/api/check")).toBe(false);
    expect(isCheckPagePath("/checkup")).toBe(false);
    expect(isCheckPagePath("/scan/invoice")).toBe(false);
  });
});
