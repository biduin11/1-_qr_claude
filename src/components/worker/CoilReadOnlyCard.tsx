import { Card } from "@/components/worker/Card";
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
      <Card style={{ maxWidth: 400, textAlign: "center" }}>
        <h1 style={{ fontSize: "var(--text-7)", marginTop: 0, marginBottom: "1.5rem" }}>Рулон</h1>
        <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "1rem", fontSize: "var(--text-6)", margin: 0 }}>
          <dt style={{ textAlign: "left", color: "var(--text-secondary)" }}>Цвет</dt>
          <dd style={{ textAlign: "right", margin: 0, fontWeight: 600, fontFamily: "var(--font-mono)" }}>RAL {coil.ral.code}</dd>

          <dt style={{ textAlign: "left", color: "var(--text-secondary)" }}>Толщина</dt>
          <dd style={{ textAlign: "right", margin: 0, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{coil.thickness.displayName}</dd>

          <dt style={{ textAlign: "left", color: "var(--text-secondary)" }}>Производитель</dt>
          <dd style={{ textAlign: "right", margin: 0, fontWeight: 600 }}>{coil.manufacturer.displayName}</dd>

          <dt style={{ textAlign: "left", color: "var(--text-secondary)" }}>Покрытие</dt>
          <dd style={{ textAlign: "right", margin: 0, fontWeight: 600 }}>{coil.coating.displayName}</dd>
        </dl>
      </Card>
    </main>
  );
}
