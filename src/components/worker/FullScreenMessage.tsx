/**
 * Полноэкранное сообщение рабочего flow.
 * Иконка «✕» (Стоп/ошибка) получает --danger-strong, не обычный --danger —
 * тот же принцип "не тише прежнего хардкода", что и в MatchScreen/
 * MismatchScreen (см. комментарий у --danger-strong в globals.css).
 * Размеры/отступы неизменны (ТЗ: результат читается за секунду).
 */
export function FullScreenMessage({
  icon,
  title,
  children,
}: {
  icon?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
        gap: "1rem",
      }}
    >
      {icon && <div style={{ fontSize: "4rem", lineHeight: 1, color: icon === "✕" ? "var(--danger-strong)" : undefined }}>{icon}</div>}
      <h1 style={{ fontSize: "2rem", margin: 0 }}>{title}</h1>
      {children}
    </main>
  );
}
