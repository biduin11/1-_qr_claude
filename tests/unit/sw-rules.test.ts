import { describe, expect, it } from "vitest";

import { isCoilVerdictApiPath } from "@/lib/pwa/sw-rules";

describe("isCoilVerdictApiPath", () => {
  it("распознаёт /api/coil/:id — маршрут, который service worker обязан отдавать строго network-only (ARCHITECTURE.md §9)", () => {
    expect(isCoilVerdictApiPath("/api/coil/abc123")).toBe(true);
  });

  it("не совпадает с соседними /api/*-путями — они не должны случайно попасть под то же правило", () => {
    expect(isCoilVerdictApiPath("/api/health")).toBe(false);
    expect(isCoilVerdictApiPath("/api/admin/coils")).toBe(false);
    expect(isCoilVerdictApiPath("/api/coils")).toBe(false);
  });

  it("не совпадает со страницей /coil/:id (HTML, а не API) — та кэшируется отдельно", () => {
    expect(isCoilVerdictApiPath("/coil/abc123")).toBe(false);
  });
});
