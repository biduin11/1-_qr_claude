"use client";

/** Кнопка печати паспорта рулона — сама разметка печатается через `@media print` (globals.css). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        padding: "0.5rem 1rem",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--brand-primary)",
        color: "var(--on-brand)",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Печать
    </button>
  );
}
