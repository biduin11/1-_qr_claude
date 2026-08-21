import { Button } from "@/components/worker/Button";

/**
 * Главный экран работника (раздел 19 ТЗ). В основном сценарии сюда не
 * заходят — QR накладной открывает /check напрямую через камеру телефона
 * (раздел 5). Этот экран — запасной вход, если приложение открыто без
 * предварительного скана (например, с главного экрана PWA).
 */
export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "var(--text-9)", margin: 0 }}>КОНТРОЛЬ МЕТАЛЛА</h1>
      <Button href="/scan/invoice">СКАНИРОВАТЬ НАКЛАДНУЮ</Button>
    </main>
  );
}
