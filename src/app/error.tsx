"use client";

import { useEffect } from "react";

export default function Error({
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
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Что-то пошло не так</h1>
      <button onClick={reset} style={{ fontSize: "1.2rem", padding: "0.75rem 1.5rem" }}>
        Повторить
      </button>
    </main>
  );
}
