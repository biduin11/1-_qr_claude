import { describe, expect, it } from "vitest";

import { compareRequirementToCoil, isFullMatch } from "@/lib/worker/compare";
import type { PublicCoil } from "@/lib/public/coil";
import type { ActiveMaterialRequirement } from "@/lib/worker/active-requirement";

const requirement: ActiveMaterialRequirement = {
  ral: "7024",
  ralDisplayName: "RAL 7024",
  thicknessHundredths: 50,
  thicknessDisplayName: "0,50 мм",
  manufacturer: "UZBEKISTAN",
  manufacturerDisplayName: "Узбекистан",
  coating: "VIKING",
  coatingDisplayName: "Viking",
  createdAt: "2026-08-12T00:00:00.000Z",
  expiresAt: null,
};

function makeCoil(overrides?: Partial<PublicCoil>): PublicCoil {
  return {
    id: "coil-1",
    active: true,
    ral: { code: "7024", displayName: "RAL 7024" },
    thickness: { valueHundredths: 50, displayName: "0,50 мм" },
    manufacturer: { code: "UZBEKISTAN", displayName: "Узбекистан" },
    coating: { code: "VIKING", displayName: "Viking" },
    ...overrides,
  };
}

describe("compareRequirementToCoil / isFullMatch", () => {
  it("все 4 совпадают -> isFullMatch true", () => {
    const comparisons = compareRequirementToCoil(requirement, makeCoil());
    expect(comparisons.every((c) => c.matches)).toBe(true);
    expect(isFullMatch(comparisons)).toBe(true);
  });

  it("неверный RAL -> только это поле не совпадает", () => {
    const comparisons = compareRequirementToCoil(
      requirement,
      makeCoil({ ral: { code: "9003", displayName: "RAL 9003" } }),
    );
    const ral = comparisons.find((c) => c.field === "ral");
    expect(ral?.matches).toBe(false);
    expect(ral?.requiredDisplay).toBe("RAL 7024");
    expect(ral?.actualDisplay).toBe("RAL 9003");
    expect(comparisons.filter((c) => !c.matches)).toHaveLength(1);
    expect(isFullMatch(comparisons)).toBe(false);
  });

  it("неверная толщина -> сравнение по valueHundredths, не по displayName", () => {
    const comparisons = compareRequirementToCoil(
      requirement,
      makeCoil({ thickness: { valueHundredths: 45, displayName: "0,45 мм" } }),
    );
    expect(comparisons.find((c) => c.field === "thickness")?.matches).toBe(false);
  });

  it("неверный производитель", () => {
    const comparisons = compareRequirementToCoil(
      requirement,
      makeCoil({ manufacturer: { code: "SEVERSTAL", displayName: "Северсталь" } }),
    );
    expect(comparisons.find((c) => c.field === "manufacturer")?.matches).toBe(false);
  });

  it("неверное покрытие", () => {
    const comparisons = compareRequirementToCoil(
      requirement,
      makeCoil({ coating: { code: "MATTE", displayName: "Matte" } }),
    );
    expect(comparisons.find((c) => c.field === "coating")?.matches).toBe(false);
  });

  it("все 4 поля не совпадают -> все 4 отмечены как mismatch (раздел 18 ТЗ)", () => {
    const comparisons = compareRequirementToCoil(
      requirement,
      makeCoil({
        ral: { code: "9003", displayName: "RAL 9003" },
        thickness: { valueHundredths: 45, displayName: "0,45 мм" },
        manufacturer: { code: "SEVERSTAL", displayName: "Северсталь" },
        coating: { code: "MATTE", displayName: "Matte" },
      }),
    );
    expect(comparisons.filter((c) => !c.matches)).toHaveLength(4);
    expect(isFullMatch(comparisons)).toBe(false);
  });

  it("сравнение строгое (===), без повторной нормализации регистра на этом шаге", () => {
    // Коды в БД всегда в верхнем регистре по дизайну (ARCHITECTURE.md §13,
    // нормализация регистра — задача material-normalization.ts при вводе, не
    // задача этого сравнения) — здесь сознательно точное равенство, не .toUpperCase().
    const comparisons = compareRequirementToCoil(
      requirement,
      makeCoil({ manufacturer: { code: "uzbekistan", displayName: "Узбекистан" } }),
    );
    expect(comparisons.find((c) => c.field === "manufacturer")?.matches).toBe(false);
  });
});
