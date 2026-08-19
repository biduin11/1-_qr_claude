import type { ActiveMaterialRequirement } from "@/lib/worker/active-requirement";

/**
 * Крупная, читаемая карточка требуемого материала — раздел 34 ТЗ (большие
 * touch targets и текст в рабочем flow, никаких мелких таблиц).
 */
export function RequirementCard({
  requirement,
}: {
  requirement: Pick<
    ActiveMaterialRequirement,
    "ralDisplayName" | "thicknessDisplayName" | "manufacturerDisplayName" | "coatingDisplayName"
  >;
}) {
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "0.75rem",
        // --text-7, не --text-6 (как в аналогичной по структуре
        // CoilReadOnlyCard) — здесь то, что работник должен найти, а не
        // пассивный просмотр уже найденного; сохраняет более крупный акцент.
        fontSize: "var(--text-7)",
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      <Row label="Цвет" value={requirement.ralDisplayName} />
      <Row label="Толщина" value={requirement.thicknessDisplayName} />
      <Row label="Производитель" value={requirement.manufacturerDisplayName} />
      <Row label="Покрытие" value={requirement.coatingDisplayName} />
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "0.5rem",
      }}
    >
      <dt style={{ color: "var(--text-secondary)" }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{value}</dd>
    </div>
  );
}
