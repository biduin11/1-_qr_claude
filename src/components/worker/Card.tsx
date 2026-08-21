import type { CSSProperties, ReactNode } from "react";

/**
 * Видимая поверхность-карточка (DealDeck: bg-card + radius-xl + shadow-card,
 * разделение тенью вместо бордера). Раньше RequirementCard/CoilReadOnlyCard
 * были просто центрированным текстом без фона/контура — оборачивает их
 * в осязаемую карточку, не трогая сам контент (шрифты/отступы полей).
 */
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        backgroundColor: "var(--bg-card)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-card)",
        padding: "var(--space-24)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
