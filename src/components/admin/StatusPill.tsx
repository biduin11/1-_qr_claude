/**
 * Общая статус-пилюля админки — раньше была определена трижды
 * (CoilsManager/ReferenceDataManager/ExcelImportManager) с разным padding
 * и расходящимся `whiteSpace: nowrap` (аудит, раздел «Повторяющиеся
 * паттерны»). Текст остаётся на вызывающей стороне — у разных ресурсов
 * разный род ("Активен"/"Активна") и разная семантика ("Активна"/
 * "Корректна"), унифицируется только визуал.
 */
export function StatusPill({ tone, label }: { tone: "success" | "danger"; label: string }) {
  const color = tone === "success" ? "var(--success)" : "var(--danger)";
  const backgroundColor = tone === "success" ? "var(--success-soft)" : "var(--danger-soft)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        borderRadius: "var(--radius-full)",
        padding: "0.25rem 0.6rem",
        fontSize: "var(--text-1)",
        fontWeight: 600,
        whiteSpace: "nowrap",
        backgroundColor,
        color,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "var(--radius-full)", backgroundColor: color }} />
      {label}
    </span>
  );
}
