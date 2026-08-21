import { ReferenceDataManager } from "@/components/admin/ReferenceDataManager";

export default function AdminThicknessesPage() {
  return (
    <ReferenceDataManager
      resourcePath="thicknesses"
      title="Толщины"
      description="Управление справочником толщин металла"
      fields={[
        {
          type: "number",
          name: "valueHundredths",
          label: "Толщина (сотые мм)",
          helpText: "50 = 0,50 мм",
        },
        { type: "text", name: "displayName", label: "Название" },
      ]}
    />
  );
}
