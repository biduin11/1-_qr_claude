import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminNavLink } from "@/components/admin/AdminNavLink";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { getCurrentAdmin } from "@/lib/auth/session";

const NAV_ITEMS = [
  { href: "/admin", label: "Главная" },
  { href: "/admin/coils", label: "Рулоны" },
  { href: "/admin/colors", label: "Цвета RAL" },
  { href: "/admin/thicknesses", label: "Толщины" },
  { href: "/admin/manufacturers", label: "Производители" },
  { href: "/admin/coatings", label: "Покрытия" },
  { href: "/admin/import", label: "Импорт из Excel" },
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
          width: 220,
          flexShrink: 0,
          backgroundColor: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border)",
          padding: "1rem 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        {/* Logo (как в fin-krovlya-header) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.25rem 0.25rem 0.75rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--brand-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--on-brand)",
              fontWeight: 700,
              fontSize: "0.75rem",
              userSelect: "none",
            }}
          >
            КМ
          </div>
          <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Контроль металла</strong>
        </div>

        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", padding: "0.5rem 0.25rem 0.25rem" }}>
          {admin.username}
        </span>

        {NAV_ITEMS.map((item) => (
          <AdminNavLink key={item.href} href={item.href} label={item.label} />
        ))}
        <LogoutButton />
      </nav>
      <main style={{ flex: 1, padding: "1.5rem", minWidth: 0 }}>{children}</main>
    </div>
  );
}
