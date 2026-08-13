import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

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
          borderRight: "1px solid #ddd",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <strong>Контроль металла</strong>
        <span style={{ fontSize: "0.85rem", color: "#666" }}>{admin.username}</span>
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
        <LogoutButton />
      </nav>
      <main style={{ flex: 1, padding: "1.5rem" }}>{children}</main>
    </div>
  );
}
