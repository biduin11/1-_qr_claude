import { ReferenceDataManager } from "@/components/admin/ReferenceDataManager";

export default function AdminManufacturersPage() {
  return (
    <ReferenceDataManager
      resourcePath="manufacturers"
      title="Производители"
      description="Управление справочником производителей"
      fields={[
        { type: "text", name: "code", label: "Код" },
        { type: "text", name: "displayName", label: "Название" },
        { type: "aliases", name: "aliases", label: "Варианты написания" },
      ]}
    />
  );
}
