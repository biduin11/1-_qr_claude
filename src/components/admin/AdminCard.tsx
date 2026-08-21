import type { HTMLAttributes } from "react";

/**
 * Белая карточка с мягкой тенью — базовая поверхность DealDeck поверх
 * лавандового фона приложения (dealdeck-design-tokens.md, §4). Разделение
 * зон идёт контрастом фона + тенью, бордер — тонкий вспомогательный контур,
 * не основной инструмент. `padded={false}` — для карточек, которые сами
 * управляют внутренними отступами построчно (например таблица).
 */
export function AdminCard({ padded = true, className, ...props }: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  const classes = ["admin-card", padded ? "admin-card-padded" : null, className].filter(Boolean).join(" ");
  return <div className={classes} {...props} />;
}
