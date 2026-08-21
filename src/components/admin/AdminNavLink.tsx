"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

/**
 * Ссылка навигации admin-раздела с подсветкой активного пункта.
 * Активный пункт — заливка brand-primary, белый текст + левый индикатор
 * (DealDeck: активный пункт навигации = сплошная primary-заливка, а не
 * мягкий тон); ховер — --bg-card-2. Состояния теперь настоящий CSS
 * (.admin-nav-link/.is-active в globals.css) — раньше были захардкожены
 * через onMouseEnter/onMouseLeave на инлайн-стилях.
 */
export function AdminNavLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link href={href} className={`admin-nav-link${active ? " is-active" : ""}`}>
      <Icon aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
