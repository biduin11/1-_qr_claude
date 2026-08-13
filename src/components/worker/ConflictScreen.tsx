import { RequirementCard } from "@/components/worker/RequirementCard";
import type { ActiveMaterialRequirement } from "@/lib/worker/active-requirement";

/**
 * Раздел 6 ТЗ («уточнение поведения»): открытие /check при уже существующем
 * незавершённом требовании — не молчаливая перезапись, а явное подтверждение.
 */
export function ConflictScreen({
  existing,
  onStartNew,
  onKeepExisting,
}: {
  existing: ActiveMaterialRequirement;
  onStartNew: () => void;
  onKeepExisting: () => void;
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
      }}
    >
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Есть незавершённая проверка</h1>
      <RequirementCard requirement={existing} />
      <p style={{ fontSize: "1.1rem" }}>Начать новую проверку вместо этой?</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: 480 }}>
        <button type="button" onClick={onStartNew} style={{ fontSize: "1.25rem", padding: "1rem" }}>
          Начать новую
        </button>
        <button type="button" onClick={onKeepExisting} style={{ fontSize: "1.25rem", padding: "1rem" }}>
          Продолжить текущую
        </button>
      </div>
    </main>
  );
}
