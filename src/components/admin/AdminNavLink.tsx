"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Ссылка навигации admin-раздела с подсветкой активного пункта.
 * Активный пункт — заливка brand-primary, белый текст + левый индикатор
 * (DealDeck: активный пункт навигации = сплошная primary-заливка, а не
 * мягкий тон); ховер — --bg-card-2. Состояния теперь настоящий CSS
 * (.admin-nav-link/.is-active в globals.css) — раньше были захардкожены
 * через onMouseEnter/onMouseLeave на инлайн-стилях.
 *
 * `icon` — уже отрендеренный узел (`<Home aria-hidden />`), а не ссылка на
 * компонент. Раньше принимался `LucideIcon` (тип компонента) и рендерился
 * здесь как `<Icon />` — вызывающая сторона (`(protected)/layout.tsx`,
 * серверный компонент) передавала иконку из lucide-react через границу
 * server→client самим компонентом-функцией, а не JSX-инстансом. React
 * умеет сериализовать через эту границу только данные и уже отрендеренные
 * элементы — компонент/forwardRef-ссылка не сериализуется, и в проде это
 * падало без внятного сообщения (React error #441, "Functions cannot be
 * passed directly to Client Components" — видно только в сыром digest).
 * Раз иконка рендерится на серверной стороне (`<item.icon aria-hidden />`
 * в layout.tsx) и передаётся сюда уже готовым ReactNode — граница
 * серверный→клиентский компонент пересекается только сериализуемым JSX.
 */
export function AdminNavLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link href={href} className={`admin-nav-link${active ? " is-active" : ""}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
