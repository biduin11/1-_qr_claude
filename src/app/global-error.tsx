"use client";

import { useEffect } from "react";

/**
 * Страховка на случай ошибки в самом RootLayout (src/app/layout.tsx) —
 * ThemeProvider/ThemeToggle там сидят ВЫШЕ src/app/error.tsx (тот
 * оборачивает только {children} внутри layout, не сам layout), поэтому
 * ошибка в них раньше не ловилась ничем и уходила в непредсказуемый
 * дефолт Next.js вместо стилизованного экрана приложения. Next.js требует
 * здесь собственные <html>/<body> — global-error подменяет весь layout
 * целиком, когда сработал именно он (не polyfill/дублирование, а другой,
 * более высокий уровень перехвата).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", margin: 0 }}>Что-то пошло не так</h1>
          <button
            onClick={reset}
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              padding: "0.75rem 1.5rem",
              border: "none",
              borderRadius: "0.5rem",
              // Хардкод, не var(--brand-orange)/var(--on-accent) — намеренно.
              // Этот экран обязан работать, даже если сломано что-то в самой
              // теме/layout (то, для чего он и есть); не завязываем
              // последнюю линию защиты на систему, которая могла быть
              // причастна к сбою.
              backgroundColor: "#ff8518",
              color: "#161616",
              cursor: "pointer",
            }}
          >
            Повторить
          </button>
        </main>
      </body>
    </html>
  );
}
