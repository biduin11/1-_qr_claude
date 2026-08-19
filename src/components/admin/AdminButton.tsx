"use client";

import type { ButtonHTMLAttributes, CSSProperties } from "react";

/**
 * Общая кнопка админки — раньше `buttonStyle` был скопирован по отдельности
 * в CoilsManager/ReferenceDataManager/ExcelImportManager с расходящимися
 * padding/fontSize (аудит, раздел «Ритм и последовательность отступов»).
 * Один компонент вместо трёх копий; `style` можно переопределить точечно
 * (например компактный padding для кнопок в строке таблицы) — как раньше
 * при `{...buttonStyle, ...}`, просто через проп, а не спред константы.
 */
type AdminButtonVariant = "secondary" | "primary";

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant;
};

const baseStyle: CSSProperties = {
  padding: "0.35rem 0.8rem",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  cursor: "pointer",
  fontSize: "var(--text-2)",
  whiteSpace: "nowrap",
};

const variantStyle: Record<AdminButtonVariant, CSSProperties> = {
  secondary: {
    backgroundColor: "var(--bg-card-2)",
    color: "var(--text-secondary)",
  },
  primary: {
    backgroundColor: "var(--brand-primary)",
    color: "var(--on-brand)",
    fontWeight: 600,
  },
};

export function AdminButton({ variant = "secondary", style, ...props }: AdminButtonProps) {
  return <button style={{ ...baseStyle, ...variantStyle[variant], ...style }} {...props} />;
}
