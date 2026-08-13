"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type FieldConfig =
  | { type: "text"; name: string; label: string }
  | { type: "number"; name: string; label: string; helpText?: string }
  | { type: "aliases"; name: string; label: string };

type ReferenceItem = {
  id: string;
  active: boolean;
  [key: string]: unknown;
};

type ApiErrorBody = { error?: { message?: string } };

function initialFormState(fields: FieldConfig[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.name, ""]));
}

function buildPayload(fields: FieldConfig[], form: Record<string, string>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = form[field.name] ?? "";
    if (field.type === "number") {
      payload[field.name] = Number(raw);
    } else if (field.type === "aliases") {
      payload[field.name] = raw
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean);
    } else {
      payload[field.name] = raw;
    }
  }
  return payload;
}

function formatValue(field: FieldConfig, value: unknown): string {
  if (field.type === "aliases") {
    return Array.isArray(value) ? value.join(", ") : "";
  }
  return value === undefined || value === null ? "" : String(value);
}

export function ReferenceDataManager({
  resourcePath,
  title,
  fields,
}: {
  resourcePath: string;
  title: string;
  fields: FieldConfig[];
}) {
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>(() => initialFormState(fields));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");

  async function fetchItems(currentFilter: typeof filter): Promise<ReferenceItem[]> {
    const query = currentFilter === "all" ? "" : `?active=${currentFilter === "active"}`;
    const response = await fetch(`/api/admin/${resourcePath}${query}`);
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as { items: ReferenceItem[] };
    return data.items;
  }

  // Событийные обработчики (submit/toggle) вызывают это напрямую — там
  // синхронный setState в порядке вещей, это не тело эффекта.
  async function reload(): Promise<void> {
    setLoading(true);
    const nextItems = await fetchItems(filter);
    setItems(nextItems);
    setLoading(false);
  }

  useEffect(() => {
    // setState здесь допустим только внутри колбэков промиса, не синхронно
    // в теле эффекта — иначе react-hooks/set-state-in-effect. Поэтому при
    // смене фильтра список молча подменяется без повторного "Загрузка…".
    let cancelled = false;
    fetchItems(filter)
      .then((nextItems) => {
        if (!cancelled) {
          setItems(nextItems);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, resourcePath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/${resourcePath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(fields, form)),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setFormError(data?.error?.message ?? "Не удалось сохранить запись");
        return;
      }

      setForm(initialFormState(fields));
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const action = active ? "restore" : "deactivate";
    await fetch(`/api/admin/${resourcePath}/${id}/${action}`, { method: "POST" });
    await reload();
  }

  return (
    <div>
      <h1>{title}</h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "1.5rem" }}
      >
        {fields.map((field) => (
          <label key={field.name} style={{ display: "flex", flexDirection: "column", fontSize: "0.85rem" }}>
            {field.label}
            <input
              type={field.type === "number" ? "number" : "text"}
              value={form[field.name] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
              required={field.type !== "aliases"}
              style={{ padding: "0.4rem" }}
            />
            {field.type === "number" && field.helpText && (
              <span style={{ color: "#666", fontSize: "0.75rem" }}>{field.helpText}</span>
            )}
            {field.type === "aliases" && (
              <span style={{ color: "#666", fontSize: "0.75rem" }}>через запятую, необязательно</span>
            )}
          </label>
        ))}
        <button type="submit" disabled={submitting} style={{ padding: "0.5rem 1rem" }}>
          Добавить
        </button>
      </form>
      {formError && <p style={{ color: "#b00020" }}>{formError}</p>}

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Показать:{" "}
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
            <option value="all">Все</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {fields.map((field) => (
                <th key={field.name} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.4rem" }}>
                  {field.label}
                </th>
              ))}
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.4rem" }}>Статус</th>
              <th style={{ borderBottom: "1px solid #ddd", padding: "0.4rem" }} />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={fields.length + 2} style={{ padding: "0.5rem", color: "#666" }}>
                  Нет записей
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                {fields.map((field) => (
                  <td key={field.name} style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>
                    {formatValue(field, item[field.name])}
                  </td>
                ))}
                <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>
                  {item.active ? "Активна" : "Неактивна"}
                </td>
                <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>
                  <button type="button" onClick={() => toggleActive(item.id, !item.active)}>
                    {item.active ? "Деактивировать" : "Восстановить"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
