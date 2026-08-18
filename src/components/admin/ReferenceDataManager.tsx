"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

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

function itemToFormState(fields: FieldConfig[], item: ReferenceItem): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.name, formatValue(field, item[field.name])]));
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

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

  function startEdit(item: ReferenceItem) {
    setEditingId(item.id);
    setEditForm(itemToFormState(fields, item));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function submitEdit(id: string) {
    setEditError(null);
    setEditSubmitting(true);

    try {
      const response = await fetch(`/api/admin/${resourcePath}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(fields, editForm)),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setEditError(data?.error?.message ?? "Не удалось сохранить изменения");
        return;
      }

      setEditingId(null);
      await reload();
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: "1.5rem", color: "var(--text-primary)", margin: "0 0 1.25rem" }}>{title}</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
          padding: "1rem",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {fields.map((field) => (
          <label key={field.name} style={{ display: "flex", flexDirection: "column", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {field.label}
            <input
              type={field.type === "number" ? "number" : "text"}
              value={form[field.name] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
              required={field.type !== "aliases"}
              style={{ marginTop: "0.25rem", padding: "0.4rem 0.5rem", backgroundColor: "var(--bg-card-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
            />
            {field.type === "number" && field.helpText && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{field.helpText}</span>
            )}
            {field.type === "aliases" && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>через запятую, необязательно</span>
            )}
          </label>
        ))}
        <button type="submit" disabled={submitting} style={{ ...buttonStyle, backgroundColor: "var(--brand-primary)", color: "var(--on-brand)" }}>
          Добавить
        </button>
      </form>
      {formError && <p style={{ color: "var(--danger)" }}>{formError}</p>}

      <div style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
        <label>
          Показать:{" "}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            style={{ backgroundColor: "var(--bg-card-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", padding: "0.35rem 0.5rem" }}
          >
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
            <option value="all">Все</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Загрузка…</p>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", backgroundColor: "var(--bg-card)" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${fields.length}, 1fr) 140px 140px`,
              padding: "0.65rem 1rem",
              backgroundColor: "var(--bg-header)",
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {fields.map((field) => (
              <span key={field.name}>{field.label}</span>
            ))}
            <span>Статус</span>
            <span />
          </div>
          {items.length === 0 && (
            <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Нет записей
            </div>
          )}
          {items.map((item, i) => {
            const isEditing = editingId === item.id;
            return (
              <div key={item.id}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${fields.length}, 1fr) 140px 140px`,
                    alignItems: "center",
                    padding: "0.6rem 1rem",
                    backgroundColor: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-card-2)",
                    borderBottom: isEditing && editError ? "none" : "1px solid var(--border)",
                    fontSize: "0.9rem",
                  }}
                >
                  {fields.map((field) => {
                    const isTechnical = field.type === "number" || field.name === "code";
                    return (
                      <span key={field.name} style={{ color: "var(--text-secondary)" }}>
                        {isEditing ? (
                          <input
                            type={field.type === "number" ? "number" : "text"}
                            value={editForm[field.name] ?? ""}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                            style={{
                              width: "100%",
                              padding: "0.3rem 0.4rem",
                              backgroundColor: "var(--bg-card-2)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius-sm)",
                              color: "var(--text-primary)",
                              fontSize: "0.85rem",
                              fontFamily: isTechnical ? "var(--font-mono)" : undefined,
                            }}
                          />
                        ) : (
                          <span style={{ fontFamily: isTechnical ? "var(--font-mono)" : undefined }}>
                            {formatValue(field, item[field.name])}
                          </span>
                        )}
                      </span>
                    );
                  })}
                  <span>
                    <StatusPill active={item.active} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => submitEdit(item.id)}
                          disabled={editSubmitting}
                          style={{ ...buttonStyle, backgroundColor: "var(--brand-primary)", color: "var(--on-brand)" }}
                        >
                          Сохранить
                        </button>
                        <button type="button" onClick={cancelEdit} disabled={editSubmitting} style={buttonStyle}>
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(item)} style={buttonStyle}>
                          Изменить
                        </button>
                        <button type="button" onClick={() => toggleActive(item.id, !item.active)} style={buttonStyle}>
                          {item.active ? "Деактивировать" : "Восстановить"}
                        </button>
                      </>
                    )}
                  </span>
                </div>
                {isEditing && editError && (
                  <div
                    style={{
                      padding: "0 1rem 0.75rem",
                      backgroundColor: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-card-2)",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--danger)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {editError}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  if (active) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", borderRadius: "999px", padding: "0.2rem 0.55rem", fontSize: "0.7rem", fontWeight: 600, backgroundColor: "var(--success-soft)", color: "var(--success)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "999px", backgroundColor: "var(--success)" }} />
        Активна
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", borderRadius: "999px", padding: "0.2rem 0.55rem", fontSize: "0.7rem", fontWeight: 600, backgroundColor: "var(--danger-soft)", color: "var(--danger)" }}>
      <span style={{ width: 6, height: 6, borderRadius: "999px", backgroundColor: "var(--danger)" }} />
      Неактивна
    </span>
  );
}

const buttonStyle: CSSProperties = {
  padding: "0.35rem 0.8rem",
  borderRadius: "var(--radius-sm)",
  backgroundColor: "var(--bg-card-2)",
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "0.8rem",
};
