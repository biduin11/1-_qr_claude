import type { FieldComparison } from "@/lib/worker/compare";

/**
 * Раздел 17 ТЗ: ✓ РУЛОН ПОДХОДИТ, все 4 характеристики с ✓, крупный итог, ЗАВЕРШИТЬ.
 *
 * Цвет — --success-strong: не обычный --success (тот даёт ~4.6:1 на своей
 * surface-подложке — ок для мелких бейджей, но заметно тише прежнего
 * хардкода ~5.3:1 на белом), а отдельный усиленный токен, который держит
 * исходный уровень контраста в обеих темах (globals.css). Мягкая success-
 * тонированная подложка (--success-surface) вместо жёсткого #f0fff4 —
 * тот же принцип ("контрастность результата не менять"), через токены темы.
 * Размеры/отступы/кнопка (--text-7) неизменны; цвет — доп. сигнал к иконке ✓
 * и крупному тексту, не единственный.
 *
 * Заголовок и "МОЖНО ИСПОЛЬЗОВАТЬ" раньше были почти равны по весу (оба
 * жирные, разница в размере всего 0.25rem) — читались как два конкурирующих
 * заголовка (аудит, «Визуальная иерархия»). h1 намеренно жирнее (800) —
 * не трогая ни размеры, ни цвет/контраст итоговой фразы (это и так самый
 * заметный результат экрана), а просто закрепляя, что заголовок — вершина
 * иерархии, а не второй такой же по весу элемент.
 */
export function MatchScreen({
  comparisons,
  onFinish,
  finishing,
}: {
  comparisons: FieldComparison[];
  onFinish: () => void;
  finishing: boolean;
}) {
  const okColor = "var(--success-strong)";

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
        background: "var(--success-surface)",
      }}
    >
      <div style={{ fontSize: "var(--text-icon)", lineHeight: 1, color: okColor }}>✓</div>
      <h1 style={{ fontSize: "var(--text-8)", fontWeight: 800, margin: 0 }}>РУЛОН ПОДХОДИТ</h1>

      <dl style={{ width: "100%", maxWidth: 480, display: "grid", gap: "0.5rem", fontSize: "var(--text-6)" }}>
        {comparisons.map((comparison) => (
          <div
            key={comparison.field}
            style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}
          >
            <dt style={{ color: "var(--text-secondary)" }}>{comparison.label}</dt>
            <dd style={{ margin: 0, fontWeight: 700, color: okColor, fontFamily: "var(--font-mono)" }}>
              ✓ {comparison.actualDisplay}
            </dd>
          </div>
        ))}
      </dl>

      <p style={{ fontSize: "var(--text-7)", fontWeight: 700, color: okColor, margin: 0 }}>МОЖНО ИСПОЛЬЗОВАТЬ</p>

      <button
        type="button"
        onClick={onFinish}
        disabled={finishing}
        style={{
          fontSize: "var(--text-7)",
          fontWeight: 700,
          padding: "1.5rem 2rem",
          width: "100%",
          maxWidth: 480,
          border: "none",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "var(--brand-orange)",
          color: "var(--on-accent)",
        }}
      >
        {finishing ? "Завершение…" : "ЗАВЕРШИТЬ"}
      </button>
    </main>
  );
}
