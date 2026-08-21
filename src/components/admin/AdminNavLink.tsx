"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Ссылка навигации admin-раздела с подсветкой активного пункта.
 * Активный пункт — заливка brand-primary, белый текст (DealDeck: активный
 * пункт навигации = сплошная primary-заливка, а не мягкий тон); ховер —
 * --bg-card-2. Раньше оба состояния были захардкожены как rgba(18,17,147,…)/
 * rgba(255,255,255,…) в расчёте на всегда-тёмный сайдбар — сломалось бы на
 * белом сайдбаре светлой темы, поэтому переведено на токены.
 */
export function AdminNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      style={{
        color: active ? "var(--on-brand)" : "var(--text-secondary)",
        backgroundColor: active ? "var(--brand-primary)" : "transparent",
        textDecoration: "none",
        fontSize: "var(--text-3)",
        fontWeight: active ? 600 : 400,
        padding: "0.55rem 0.75rem",
        borderRadius: "var(--radius-md)",
        transition: "background-color 0.15s ease, color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!active)
          ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-card-2)");
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
