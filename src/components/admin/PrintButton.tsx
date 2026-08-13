"use client";

/** Кнопка печати паспорта рулона — сама разметка печатается через `@media print` (globals.css). */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} style={{ padding: "0.5rem 1rem" }}>
      Печать
    </button>
  );
}
