import type { FieldComparison } from "@/lib/worker/compare";

/**
 * Раздел 18 ТЗ: ✕ СТОП, показать ВСЕ несовпадающие характеристики (не только
 * первую) с «Нужно: … / На рулоне: …» для каждой. Активное требование не
 * очищается — кнопка ведёт на новый скан рулона, не на /check.
 *
 * Цвет — --danger-strong: не обычный --danger (тот даёт ~4.2:1 на своей
 * surface-подложке — ок для мелких бейджей, но заметно тише прежнего
 * хардкода ~7.1:1 на белом), а отдельный усиленный токен, который держит
 * исходный уровень контраста в обеих темах (globals.css). Мягкая danger-
 * тонированная подложка (--danger-surface) вместо жёсткого #fff5f5 —
 * тот же принцип ("контрастность результата не менять"), через токены темы.
 * Размеры/отступы/кнопка (1.5rem) не меняются: результат читается за
 * секунду, цвет — доп. сигнал (иконка ✕ и сам текст остаются).
 */
export function MismatchScreen({
  comparisons,
  onScanAnother,
}: {
  comparisons: FieldComparison[];
  onScanAnother: () => void;
}) {
  const mismatches = comparisons.filter((comparison) => !comparison.matches);
  const stopColor = "var(--danger-strong)";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "1.5rem",
        textAlign: "center",
        background: "var(--danger-surface)",
      }}
    >
      <div style={{ fontSize: "4rem", lineHeight: 1, color: stopColor }}>✕</div>
      <h1 style={{ fontSize: "1.75rem", margin: 0, color: stopColor }}>СТОП — РУЛОН НЕ ПОДХОДИТ</h1>

      <div style={{ width: "100%", maxWidth: 480, display: "grid", gap: "1rem" }}>
        {mismatches.map((comparison) => (
          <div
            key={comparison.field}
            style={{ textAlign: "left", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "0.75rem 1rem" }}
          >
            <strong style={{ fontSize: "1.1rem" }}>{comparison.label}</strong>
            <p style={{ margin: "0.25rem 0 0", fontFamily: "var(--font-mono)" }}>Нужно: {comparison.requiredDisplay}</p>
            <p style={{ margin: 0, color: stopColor, fontFamily: "var(--font-mono)" }}>На рулоне: {comparison.actualDisplay}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onScanAnother}
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          padding: "1.25rem 2rem",
          width: "100%",
          maxWidth: 480,
          border: "none",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "var(--brand-orange)",
          color: "var(--on-accent)",
        }}
      >
        СКАНИРОВАТЬ ДРУГОЙ РУЛОН
      </button>
    </main>
  );
}
