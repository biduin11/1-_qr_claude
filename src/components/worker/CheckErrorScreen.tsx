import { FullScreenMessage } from "@/components/worker/FullScreenMessage";

/** Раздел 14 ТЗ: «ОШИБКА В НАКЛАДНОЙ» с указанием, что именно не распознано. */
export function CheckErrorScreen({ errors }: { errors: string[] }) {
  return (
    <FullScreenMessage icon="✕" title="ОШИБКА В НАКЛАДНОЙ">
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "1.1rem", color: "#b00020" }}>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </FullScreenMessage>
  );
}
