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
      {icon && <div style={{ fontSize: "4rem", lineHeight: 1 }}>{icon}</div>}
      <h1 style={{ fontSize: "2rem", margin: 0 }}>{title}</h1>
      {children}
    </main>
  );
}
