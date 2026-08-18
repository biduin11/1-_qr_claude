"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(data?.error?.message ?? "Не удалось войти");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Не удалось связаться с сервером");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        Логин
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem", backgroundColor: "var(--bg-card-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
        />
      </label>
      <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        Пароль
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem", backgroundColor: "var(--bg-card-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
        />
      </label>
      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        style={{ padding: "0.6rem 1rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--brand-primary)", border: "1px solid var(--border)", color: "var(--on-brand)", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}
      >
        {submitting ? "Вход…" : "Войти"}
      </button>
    </form>
  );
}
