import { ReferenceDataManager } from "@/components/admin/ReferenceDataManager";

export default function AdminColorsPage() {
  return (
    <ReferenceDataManager
      resourcePath="colors"
      title="Цвета RAL"
      description="Управление справочником цветов RAL"
      fields={[
        { type: "text", name: "code", label: "Код RAL" },
        { type: "text", name: "displayName", label: "Название" },
      ]}
    />
  );
}
