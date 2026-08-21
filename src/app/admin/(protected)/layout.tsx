import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Building2, Disc, FileSpreadsheet, Home, Layers, Palette, Ruler } from "lucide-react";

import { AdminNavLink } from "@/components/admin/AdminNavLink";
import { SystemStatus } from "@/components/admin/SystemStatus";
import { UserMenu } from "@/components/admin/UserMenu";
import { getCurrentAdmin } from "@/lib/auth/session";

const NAV_ITEMS = [
  { href: "/admin", label: "Главная", icon: Home },
  { href: "/admin/coils", label: "Рулоны", icon: Disc },
  { href: "/admin/colors", label: "Цвета RAL", icon: Palette },
  { href: "/admin/thicknesses", label: "Толщины", icon: Ruler },
  { href: "/admin/manufacturers", label: "Производители", icon: Building2 },
  { href: "/admin/coatings", label: "Покрытия", icon: Layers },
  { href: "/admin/import", label: "Импорт из Excel", icon: FileSpreadsheet },
];

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        className="no-print"
        style={{
          width: 272,
          flexShrink: 0,
          backgroundColor: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border)",
          padding: "1.25rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.3rem",
        }}
      >
        {/* Логотип */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.25rem 0.25rem 1.1rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--brand-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--on-brand)",
              fontWeight: 700,
              fontSize: "var(--text-2)",
              userSelect: "none",
              boxShadow: "var(--shadow-primary)",
            }}
          >
            КМ
          </div>
          <strong style={{ fontSize: "var(--text-4)", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            Контроль металла
          </strong>
        </div>

        {/* Блок пользователя */}
        <div style={{ paddingBottom: "0.85rem", marginBottom: "0.6rem", borderBottom: "1px solid var(--border)" }}>
          <UserMenu username={admin.username} />
        </div>

        {NAV_ITEMS.map((item) => (
          <AdminNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
        ))}

        <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
          <SystemStatus />
        </div>
      </nav>
      <main style={{ flex: 1, minWidth: 0, padding: "2rem 2.5rem" }}>{children}</main>
    </div>
  );
}
