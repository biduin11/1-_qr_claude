"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { LogIn } from "lucide-react";

import { AdminButton } from "@/components/admin/AdminButton";

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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <label className="admin-field">
        <span className="admin-field-label">Логин</span>
        <input
          type="text"
          className="admin-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </label>
      <label className="admin-field">
        <span className="admin-field-label">Пароль</span>
        <input
          type="password"
          className="admin-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error && (
        <p style={{ color: "var(--danger)", fontSize: "var(--text-2)", margin: 0 }}>{error}</p>
      )}
      <AdminButton type="submit" variant="primary" icon={<LogIn size={15} />} disabled={submitting} style={{ width: "100%" }}>
        {submitting ? "Вход…" : "Войти"}
      </AdminButton>
    </form>
  );
}
