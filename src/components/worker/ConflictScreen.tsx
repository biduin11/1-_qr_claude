import { Button } from "@/components/worker/Button";
import { RequirementCard } from "@/components/worker/RequirementCard";
import type { ActiveMaterialRequirement } from "@/lib/worker/active-requirement";

/**
 * Раздел 6 ТЗ («уточнение поведения»): открытие /check при уже существующем
 * незавершённом требовании — не молчаливая перезапись, а явное подтверждение.
 *
 * Обе кнопки — того же размера (--text-7, padding 1.5rem 2rem), что и
 * главный CTA на остальных рабочих экранах: раньше здесь было 1.25rem/1rem,
 * заметно мельче (аудит, «Ритм и последовательность отступов»); различие
 * между "главным" и "второстепенным" действием — только цветом (оранжевая
 * заливка vs нейтральная обводка), не размером.
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
      <h1 style={{ fontSize: "var(--text-7)", margin: 0 }}>Есть незавершённая проверка</h1>
      <RequirementCard requirement={existing} />
      <p style={{ fontSize: "var(--text-5)" }}>Начать новую проверку вместо этой?</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: 480 }}>
        <Button onClick={onStartNew}>Начать новую</Button>
        <Button variant="secondary" onClick={onKeepExisting}>
          Продолжить текущую
        </Button>
      </div>
    </main>
  );
}
