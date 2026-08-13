import type { PublicCoil } from "@/lib/public/coil";
import type { ActiveMaterialRequirement } from "@/lib/worker/active-requirement";

/**
 * Точное сравнение канонических значений — раздел 16 ТЗ. Никакого fuzzy
 * matching, ИИ, допусков без явного бизнес-правила. Сравнение всегда по
 * каноническим кодам (не display-именам, не id справочников этой БД — код
 * рулона приходит из /api/coil/:id независимо от того, какая это БД).
 */
export type FieldComparison = {
  field: "ral" | "thickness" | "manufacturer" | "coating";
  label: string;
  requiredDisplay: string;
  actualDisplay: string;
  matches: boolean;
};

export function compareRequirementToCoil(
  requirement: ActiveMaterialRequirement,
  coil: PublicCoil,
): FieldComparison[] {
  return [
    {
      field: "ral",
      label: "Цвет",
      requiredDisplay: requirement.ralDisplayName,
      actualDisplay: coil.ral.displayName,
      matches: requirement.ral === coil.ral.code,
    },
    {
      field: "thickness",
      label: "Толщина",
      requiredDisplay: requirement.thicknessDisplayName,
      actualDisplay: coil.thickness.displayName,
      matches: requirement.thicknessHundredths === coil.thickness.valueHundredths,
    },
    {
      field: "manufacturer",
      label: "Производитель",
      requiredDisplay: requirement.manufacturerDisplayName,
      actualDisplay: coil.manufacturer.displayName,
      matches: requirement.manufacturer === coil.manufacturer.code,
    },
    {
      field: "coating",
      label: "Покрытие",
      requiredDisplay: requirement.coatingDisplayName,
      actualDisplay: coil.coating.displayName,
      matches: requirement.coating === coil.coating.code,
    },
  ];
}

export function isFullMatch(comparisons: FieldComparison[]): boolean {
  return comparisons.every((comparison) => comparison.matches);
}
