"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Pencil, Plus, PowerOff, RotateCcw, X } from "lucide-react";

import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { PageHeader } from "@/components/admin/PageHeader";
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

const PAGE_SIZE = 8;

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
  description,
  fields,
}: {
  resourcePath: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
}) {
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>(() => initialFormState(fields));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");
  const [page, setPage] = useState(1);
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

  // Пагинация выводится из items/page на каждый рендер, а не синхронизируется
  // отдельным эффектом — если после деактивации текущая страница опустела,
  // currentPage сам зажимается к последней существующей.
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const gridColumns = `repeat(${fields.length}, minmax(0, 1fr)) 140px minmax(352px, max-content)`;

  return (
    <div style={{ maxWidth: 1040 }}>
      <PageHeader title={title} description={description} />

      <AdminCard style={{ marginBottom: "1.5rem" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          {fields.map((field) => {
            const hint =
              field.type === "number" && field.helpText
                ? field.helpText
                : field.type === "aliases"
                  ? "через запятую, необязательно"
                  : null;
            return (
              <label key={field.name} className="admin-field" style={{ flex: "1 1 200px", minWidth: 180 }}>
                <span className="admin-field-label">{field.label}</span>
                <input
                  type={field.type === "number" ? "number" : "text"}
                  className="admin-input"
                  value={form[field.name] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  required={field.type !== "aliases"}
                />
                <span className="admin-field-hint">{hint ?? " "}</span>
              </label>
            );
          })}
          {/* Невидимая строка-заглушка над кнопкой той же высоты, что и
              подпись поля над инпутом — при alignItems:flex-start кнопка
              встаёт вровень с инпутами, а не с их подписями. */}
          <div style={{ display: "flex", flexDirection: "column", flex: "0 0 auto" }}>
            <span aria-hidden style={{ fontSize: "var(--text-2)", visibility: "hidden" }}>
              &nbsp;
            </span>
            <AdminButton type="submit" variant="primary" icon={<Plus size={15} />} disabled={submitting}>
              Добавить
            </AdminButton>
          </div>
        </form>
        {formError && (
          <p style={{ color: "var(--danger)", fontSize: "var(--text-2)", margin: "0.75rem 0 0" }}>{formError}</p>
        )}
      </AdminCard>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-2)", fontWeight: 500 }}>Показать:</span>
        <div style={{ width: 200 }}>
          <AdminSelect
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as typeof filter);
              setPage(1);
            }}
          >
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
            <option value="all">Все</option>
          </AdminSelect>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Загрузка…</p>
      ) : (
        <div className="admin-table">
          <div className="admin-table-head" style={{ gridTemplateColumns: gridColumns, gap: "1.5rem" }}>
            {fields.map((field) => (
              <span key={field.name}>{field.label}</span>
            ))}
            <span>Статус</span>
            <span>Действия</span>
          </div>
          {pagedItems.length === 0 && <div className="admin-table-empty">Нет записей</div>}
          {pagedItems.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div key={item.id}>
                <div className="admin-table-row" style={{ gridTemplateColumns: gridColumns, gap: "1.5rem" }}>
                  {fields.map((field) => {
                    const isTechnical = isTechnicalField(field);
                    return (
                      <span key={field.name} style={{ color: "var(--text-secondary)" }}>
                        {isEditing ? (
                          <input
                            type={field.type === "number" ? "number" : "text"}
                            className="admin-input"
                            value={editForm[field.name] ?? ""}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                            style={{ fontFamily: isTechnical ? "var(--font-mono)" : undefined }}
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
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    {isEditing ? (
                      <>
                        <AdminButton
                          type="button"
                          size="sm"
                          variant="primary"
                          className="admin-btn-col-1"
                          icon={<Check size={13} />}
                          onClick={() => submitEdit(item.id)}
                          disabled={editSubmitting}
                        >
                          Сохранить
                        </AdminButton>
                        <AdminButton
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="admin-btn-col-2"
                          icon={<X size={13} />}
                          onClick={cancelEdit}
                          disabled={editSubmitting}
                        >
                          Отмена
                        </AdminButton>
                      </>
                    ) : (
                      <>
                        <AdminButton
                          type="button"
                          size="sm"
                          variant="outline-accent"
                          className="admin-btn-col-1"
                          icon={<Pencil size={13} />}
                          onClick={() => startEdit(item)}
                        >
                          Изменить
                        </AdminButton>
                        {item.active ? (
                          <AdminButton
                            type="button"
                            size="sm"
                            variant="outline-danger"
                            className="admin-btn-col-2"
                            icon={<PowerOff size={13} />}
                            onClick={() => toggleActive(item.id, false)}
                          >
                            Деактивировать
                          </AdminButton>
                        ) : (
                          <AdminButton
                            type="button"
                            size="sm"
                            variant="outline-success"
                            className="admin-btn-col-2"
                            icon={<RotateCcw size={13} />}
                            onClick={() => toggleActive(item.id, true)}
                          >
                            Восстановить
                          </AdminButton>
                        )}
                      </>
                    )}
                  </span>
                </div>
                {isEditing && editError && (
                  <div
                    style={{
                      padding: "0 1.25rem 0.85rem",
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
          <AdminPagination page={currentPage} pageSize={PAGE_SIZE} total={items.length} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
