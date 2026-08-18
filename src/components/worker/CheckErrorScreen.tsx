import { FullScreenMessage } from "@/components/worker/FullScreenMessage";

/**
 * Раздел 14 ТЗ: «ОШИБКА В НАКЛАДНОЙ» с указанием, что именно не распознано.
 * --danger-strong, не --danger — тот же принцип "не тише прежнего хардкода",
 * что и в MatchScreen/MismatchScreen (см. комментарий у --danger-strong в
 * globals.css).
 */
export function CheckErrorScreen({ errors }: { errors: string[] }) {
  return (
    <FullScreenMessage icon="✕" title="ОШИБКА В НАКЛАДНОЙ">
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "1.1rem", color: "var(--danger-strong)" }}>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </FullScreenMessage>
  );
}
