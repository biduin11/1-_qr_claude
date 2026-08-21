"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Общая кнопка админки — раньше `buttonStyle` был скопирован по отдельности
 * в CoilsManager/ReferenceDataManager/ExcelImportManager с расходящимися
 * padding/fontSize (аудит, раздел «Ритм и последовательность отступов»).
 * Один компонент вместо трёх копий; `style` можно переопределить точечно
 * (например компактный padding для кнопок в строке таблицы) — как раньше
 * при `{...buttonStyle, ...}`, просто через проп, а не спред константы.
 *
 * hover/active/disabled теперь настоящие CSS-состояния классов admin-btn-*
 * (globals.css), а не onMouseEnter/onMouseLeave на инлайн-стилях.
 */
type AdminButtonVariant = "primary" | "secondary" | "outline-accent" | "outline-danger" | "outline-success";
type AdminButtonSize = "md" | "sm";

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  icon?: ReactNode;
};

const VARIANT_CLASS: Record<AdminButtonVariant, string> = {
  primary: "admin-btn-primary",
  secondary: "admin-btn-secondary",
  "outline-accent": "admin-btn-outline-accent",
  "outline-danger": "admin-btn-outline-danger",
  "outline-success": "admin-btn-outline-success",
};

export function AdminButton({ variant = "secondary", size = "md", icon, className, children, ...props }: AdminButtonProps) {
  const classes = ["admin-btn", VARIANT_CLASS[variant], size === "sm" ? "admin-btn-sm" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {icon}
      {children}
    </button>
  );
}
