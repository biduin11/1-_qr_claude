import type { FieldComparison } from "@/lib/worker/compare";

/**
 * Раздел 18 ТЗ: ✕ СТОП, показать ВСЕ несовпадающие характеристики (не только
 * первую) с «Нужно: … / На рулоне: …» для каждой. Активное требование не
 * очищается — кнопка ведёт на новый скан рулона, не на /check.
 */
export function MismatchScreen({
  comparisons,
  onScanAnother,
}: {
  comparisons: FieldComparison[];
  onScanAnother: () => void;
}) {
  const mismatches = comparisons.filter((comparison) => !comparison.matches);

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
        background: "#fff5f5",
      }}
    >
      <div style={{ fontSize: "4rem", lineHeight: 1, color: "#b00020" }}>✕</div>
      <h1 style={{ fontSize: "1.75rem", margin: 0, color: "#b00020" }}>СТОП — РУЛОН НЕ ПОДХОДИТ</h1>

      <div style={{ width: "100%", maxWidth: 480, display: "grid", gap: "1rem" }}>
        {mismatches.map((comparison) => (
          <div
            key={comparison.field}
            style={{ textAlign: "left", background: "#fff", border: "1px solid #f0c0c0", borderRadius: 8, padding: "0.75rem 1rem" }}
          >
            <strong style={{ fontSize: "1.1rem" }}>{comparison.label}</strong>
            <p style={{ margin: "0.25rem 0 0" }}>Нужно: {comparison.requiredDisplay}</p>
            <p style={{ margin: 0, color: "#b00020" }}>На рулоне: {comparison.actualDisplay}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onScanAnother}
        style={{ fontSize: "1.5rem", padding: "1.25rem 2rem", width: "100%", maxWidth: 480 }}
      >
        СКАНИРОВАТЬ ДРУГОЙ РУЛОН
      </button>
    </main>
  );
}
