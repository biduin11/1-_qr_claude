"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { AdminButton } from "@/components/admin/AdminButton";
import { StatusPill } from "@/components/admin/StatusPill";

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

/** `code`/числовые поля — единственные "чисто технические" колонки в этих
 * таблицах, их значения набираются моноширинным шрифтом (как в CoilsManager
 * нет отдельной колонки code, но там нет и повода — здесь код/номер и
 * составное название стоят рядом, и моно отличает одно от другого).
 * Выравнивание у всех колонок левое — как в CoilsManager, для единообразия
 * между двумя admin-таблицами. */
function isTechnicalField(field: FieldConfig): boolean {
  return field.type === "number" || field.name === "code";
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
      <h1 style={{ fontSize: "var(--text-7)", color: "var(--text-primary)", margin: "0 0 1.25rem" }}>{title}</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
          padding: "1rem",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {fields.map((field) => {
          const caption =
            field.type === "number" && field.helpText
              ? field.helpText
              : field.type === "aliases"
                ? "через запятую, необязательно"
                : null;
          return (
            <label key={field.name} style={{ display: "flex", flexDirection: "column", fontSize: "var(--text-2)", color: "var(--text-secondary)" }}>
              {field.label}
              <input
                type={field.type === "number" ? "number" : "text"}
                value={form[field.name] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                required={field.type !== "aliases"}
                style={{ marginTop: "0.25rem", padding: "0.4rem 0.5rem", backgroundColor: "var(--bg-card-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
              />
              {/* Подпись всегда занимает строку, даже пустая — иначе поля
                  без неё ("Название") короче полей с ней ("Варианты
                  написания"), и высота полей в ряду расходится, и кнопка
                  "Добавить" встаёт не туда. */}
              <span style={{ color: "var(--text-muted)", fontSize: "var(--text-1)", marginTop: "0.2rem" }}>{caption ?? " "}</span>
            </label>
          );
        })}
        {/* Невидимая строка-заглушка над кнопкой той же высоты, что и
            подпись поля над инпутом — при alignItems:flex-start кнопка
            встаёт вровень с инпутами, а не с их подписями. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span aria-hidden style={{ fontSize: "var(--text-2)", visibility: "hidden" }}>
            &nbsp;
          </span>
          <AdminButton type="submit" variant="primary" disabled={submitting} style={{ marginTop: "0.25rem" }}>
            Добавить
          </AdminButton>
        </div>
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
              // Без gap длинное значение может почти заполнить свою
              // fr-колонку и упереться прямо в левый край следующей —
              // "7024RAL 7024" в одну строку без пробела (тот же класс
              // бага, что и в CoilsManager, см. комментарий там).
              gap: "1.5rem",
              padding: "0.65rem 1rem",
              backgroundColor: "var(--bg-header)",
              color: "var(--text-muted)",
              fontSize: "var(--text-1)",
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
            <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-3)" }}>
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
                    gap: "1.5rem",
                    alignItems: "center",
                    padding: "0.6rem 1rem",
                    backgroundColor: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-card-2)",
                    borderBottom: isEditing && editError ? "none" : "1px solid var(--border)",
                    fontSize: "var(--text-3)",
                  }}
                >
                  {fields.map((field) => {
                    const isTechnical = isTechnicalField(field);
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
                              fontSize: "var(--text-2)",
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
                    <StatusPill tone={item.active ? "success" : "danger"} label={item.active ? "Активна" : "Неактивна"} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {isEditing ? (
                      <>
                        <AdminButton type="button" variant="primary" onClick={() => submitEdit(item.id)} disabled={editSubmitting}>
                          Сохранить
                        </AdminButton>
                        <AdminButton type="button" onClick={cancelEdit} disabled={editSubmitting}>
                          Отмена
                        </AdminButton>
                      </>
                    ) : (
                      <>
                        <AdminButton type="button" onClick={() => startEdit(item)}>Изменить</AdminButton>
                        <AdminButton type="button" onClick={() => toggleActive(item.id, !item.active)}>
                          {item.active ? "Деактивировать" : "Восстановить"}
                        </AdminButton>
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
                      fontSize: "var(--text-2)",
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
