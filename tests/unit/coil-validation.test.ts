import { describe, expect, it } from "vitest";

import { coilInputSchema } from "@/lib/validation/coil";

describe("coilInputSchema", () => {
  const valid = {
    colorId: "color-1",
    thicknessId: "thickness-1",
    manufacturerId: "manufacturer-1",
    coatingId: "coating-1",
  };

  it("принимает корректный набор ссылок", () => {
    expect(coilInputSchema.safeParse(valid).success).toBe(true);
  });

  it.each(["colorId", "thicknessId", "manufacturerId", "coatingId"] as const)(
    "отклоняет отсутствие %s",
    (field) => {
      const rest: Record<string, string> = { ...valid };
      delete rest[field];
      expect(coilInputSchema.safeParse(rest).success).toBe(false);
    },
  );

  it("отклоняет пустую строку", () => {
    expect(coilInputSchema.safeParse({ ...valid, colorId: "" }).success).toBe(false);
  });

  it("partial() допускает частичное обновление (для PATCH)", () => {
    const result = coilInputSchema.partial().safeParse({ colorId: "color-2" });
    expect(result.success).toBe(true);
  });
});
