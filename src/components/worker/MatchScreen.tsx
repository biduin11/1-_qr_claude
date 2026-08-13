import type { FieldComparison } from "@/lib/worker/compare";

/** Раздел 17 ТЗ: ✓ РУЛОН ПОДХОДИТ, все 4 характеристики с ✓, крупный итог, ЗАВЕРШИТЬ. */
export function MatchScreen({
  comparisons,
  onFinish,
  finishing,
}: {
  comparisons: FieldComparison[];
  onFinish: () => void;
  finishing: boolean;
}) {
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
        background: "#f0fff4",
      }}
    >
      <div style={{ fontSize: "4rem", lineHeight: 1, color: "#0a7d2c" }}>✓</div>
      <h1 style={{ fontSize: "1.75rem", margin: 0 }}>РУЛОН ПОДХОДИТ</h1>

      <dl style={{ width: "100%", maxWidth: 480, display: "grid", gap: "0.5rem", fontSize: "1.25rem" }}>
        {comparisons.map((comparison) => (
          <div
            key={comparison.field}
            style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #cde9d5" }}
          >
            <dt style={{ color: "#666" }}>{comparison.label}</dt>
            <dd style={{ margin: 0, fontWeight: 700 }}>✓ {comparison.actualDisplay}</dd>
          </div>
        ))}
      </dl>

      <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0a7d2c", margin: 0 }}>МОЖНО ИСПОЛЬЗОВАТЬ</p>

      <button
        type="button"
        onClick={onFinish}
        disabled={finishing}
        style={{ fontSize: "1.5rem", padding: "1.25rem 2rem", width: "100%", maxWidth: 480 }}
      >
        {finishing ? "Завершение…" : "ЗАВЕРШИТЬ"}
      </button>
    </main>
  );
}
