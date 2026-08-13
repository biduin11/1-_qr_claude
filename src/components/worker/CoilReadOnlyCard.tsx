import type { PublicCoil } from "@/lib/public/coil";

/** Read-only карточка рулона — нет активного требования, значит нет вердикта (раздел 8 ТЗ). */
export function CoilReadOnlyCard({ coil }: { coil: Pick<PublicCoil, "ral" | "thickness" | "manufacturer" | "coating"> }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Рулон</h1>
        <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "1rem", fontSize: "1.25rem" }}>
          <dt style={{ textAlign: "left", color: "#666" }}>Цвет</dt>
          <dd style={{ textAlign: "right", margin: 0, fontWeight: 600 }}>RAL {coil.ral.code}</dd>

          <dt style={{ textAlign: "left", color: "#666" }}>Толщина</dt>
          <dd style={{ textAlign: "right", margin: 0, fontWeight: 600 }}>{coil.thickness.displayName}</dd>

          <dt style={{ textAlign: "left", color: "#666" }}>Производитель</dt>
          <dd style={{ textAlign: "right", margin: 0, fontWeight: 600 }}>{coil.manufacturer.displayName}</dd>

          <dt style={{ textAlign: "left", color: "#666" }}>Покрытие</dt>
          <dd style={{ textAlign: "right", margin: 0, fontWeight: 600 }}>{coil.coating.displayName}</dd>
        </dl>
      </div>
    </main>
  );
}
