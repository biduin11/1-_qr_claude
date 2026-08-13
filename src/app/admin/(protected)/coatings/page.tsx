import { ReferenceDataManager } from "@/components/admin/ReferenceDataManager";

export default function AdminCoatingsPage() {
  return (
    <ReferenceDataManager
      resourcePath="coatings"
      title="Покрытия"
      fields={[
        { type: "text", name: "code", label: "Код" },
        { type: "text", name: "displayName", label: "Название" },
        { type: "aliases", name: "aliases", label: "Варианты написания" },
      ]}
    />
  );
}
