"use client";

import { useEffect } from "react";

import { Button } from "@/components/worker/Button";

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
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "var(--text-9)", margin: 0 }}>Что-то пошло не так</h1>
      <Button
        onClick={reset}
        style={{ fontSize: "var(--text-6)", padding: "0.75rem 1.5rem", width: "auto", maxWidth: "none" }}
      >
        Повторить
      </Button>
    </main>
  );
}
