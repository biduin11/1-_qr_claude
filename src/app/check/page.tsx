import { CheckErrorScreen } from "@/components/worker/CheckErrorScreen";
import { CheckRequirementScreen } from "@/components/worker/CheckRequirementScreen";
import type { IncomingRequirement } from "@/components/worker/CheckRequirementScreen";
import { loadReferenceData, validateMaterialRow } from "@/lib/material-normalization";

// Всегда живой запрос к БД — параметры одноразовые (QR из 1С), не кэшируется.
export const dynamic = "force-dynamic";

function toRawValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function CheckPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = {
    ral: toRawValue(params.ral),
    thickness: toRawValue(params.thickness),
    manufacturer: toRawValue(params.manufacturer),
    coating: toRawValue(params.coating),
  };

  const refs = await loadReferenceData();
  const result = validateMaterialRow(raw, refs);

  if (result.status === "invalid") {
    return <CheckErrorScreen errors={result.errors} />;
  }

  // ids уже провалидированы (все 4 ссылки существуют и активны) — берём
  // соответствующие записи из уже загруженных refs, без второго похода в БД.
  const color = refs.colors.find((item) => item.id === result.colorId);
  const thickness = refs.thicknesses.find((item) => item.id === result.thicknessId);
  const manufacturer = refs.manufacturers.find((item) => item.id === result.manufacturerId);
  const coating = refs.coatings.find((item) => item.id === result.coatingId);

  if (!color || !thickness || !manufacturer || !coating) {
    // Теоретически недостижимо (result.status === "valid" это гарантирует),
    // но fail closed — не показываем требование без полных данных.
    return <CheckErrorScreen errors={["Не удалось разрешить данные накладной"]} />;
  }

  const incoming: IncomingRequirement = {
    ral: color.code,
    ralDisplayName: color.displayName,
    thicknessHundredths: thickness.valueHundredths,
    thicknessDisplayName: thickness.displayName,
    manufacturer: manufacturer.code,
    manufacturerDisplayName: manufacturer.displayName,
    coating: coating.code,
    coatingDisplayName: coating.displayName,
  };

  return <CheckRequirementScreen incoming={incoming} />;
}
