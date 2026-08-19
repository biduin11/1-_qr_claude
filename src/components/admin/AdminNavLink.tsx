"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Ссылка навигации admin-раздела с подсветкой активного пункта.
 * Перенос стиля из fin-krovlya `Sidebar.tsx`: активный пункт — мягкий
 * фон brand-primary и светлый акцент; ховер — полупрозрачный белый.
 */
export function AdminNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      style={{
        color: active ? "var(--link)" : "var(--text-secondary)",
        backgroundColor: active ? "rgba(18,17,147,0.25)" : "transparent",
        textDecoration: "none",
        fontSize: "var(--text-3)",
        fontWeight: active ? 600 : 400,
        padding: "0.55rem 0.75rem",
        borderRadius: "var(--radius-md)",
        transition: "background-color 0.15s ease, color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!active)
          ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)");
      }}
      onMouseLeave={(e) => {
        if (!active)
          ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent");
      }}
    >
      {label}
    </Link>
  );
}
