import { AdminCard } from "@/components/admin/AdminCard";
import { PageHeader } from "@/components/admin/PageHeader";

export default function AdminDashboardPage() {
  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader title="Администрирование" description="Обзор раздела администратора" />
      <AdminCard style={{ color: "var(--text-secondary)", fontSize: "var(--text-3)", lineHeight: 1.6 }}>
        Справочники и рулоны управляются через раздел слева: цвета RAL, толщины, производители и
        покрытия — как отдельные справочники, рулоны — в своём разделе.
      </AdminCard>
    </div>
  );
}
