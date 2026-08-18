"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

type RefOption = { id: string; displayName: string };

type CoilItem = {
  id: string;
  active: boolean;
  color: RefOption;
  thickness: RefOption;
  manufacturer: RefOption;
  coating: RefOption;
};

type RefLists = {
  colors: RefOption[];
  thicknesses: RefOption[];
  manufacturers: RefOption[];
  coatings: RefOption[];
};

const EMPTY_REFS: RefLists = { colors: [], thicknesses: [], manufacturers: [], coatings: [] };

type CoilFormState = {
  colorId: string;
  thicknessId: string;
  manufacturerId: string;
  coatingId: string;
};

const EMPTY_FORM: CoilFormState = { colorId: "", thicknessId: "", manufacturerId: "", coatingId: "" };

async function fetchRefOptions(resource: string): Promise<RefOption[]> {
  const response = await fetch(`/api/admin/${resource}?active=true`);
  if (!response.ok) return [];
  const data = (await response.json()) as { items: RefOption[] };
  return data.items;
}

function RefSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: RefOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        style={{ padding: "0.4rem", marginTop: "0.25rem", backgroundColor: "var(--bg-card-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
      >
        <option value="" disabled>
          — выбрать —
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Плашка статуса рулона — цвет из палитры источника (--success / --danger). */
function StatusPill({ active }: { active: boolean }) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    borderRadius: "999px",
    padding: "0.25rem 0.6rem",
    fontSize: "0.7rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };
  if (active) {
    return (
      <span style={{ ...base, backgroundColor: "var(--success-soft)", color: "var(--success)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "999px", backgroundColor: "var(--success)" }} />
        Активен
      </span>
    );
  }
  return (
    <span style={{ ...base, backgroundColor: "var(--danger-soft)", color: "var(--danger)" }}>
      <span style={{ width: 6, height: 6, borderRadius: "999px", backgroundColor: "var(--danger)" }} />
      Неактивен
    </span>
  );
}

export function CoilsManager() {
  const [refs, setRefs] = useState<RefLists>(EMPTY_REFS);
  const [items, setItems] = useState<CoilItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CoilFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CoilFormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchRefOptions("colors"),
      fetchRefOptions("thicknesses"),
      fetchRefOptions("manufacturers"),
      fetchRefOptions("coatings"),
    ]).then(([colors, thicknesses, manufacturers, coatings]) => {
      if (!cancelled) {
        setRefs({ colors, thicknesses, manufacturers, coatings });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchCoils(): Promise<CoilItem[]> {
    const query = new URLSearchParams();
    if (activeFilter !== "all") query.set("active", String(activeFilter === "active"));
    if (search.trim()) query.set("search", search.trim());
    const response = await fetch(`/api/admin/coils?${query.toString()}`);
    if (!response.ok) return [];
    const data = (await response.json()) as { items: CoilItem[] };
    return data.items;
  }

  async function reload(): Promise<void> {
    setLoading(true);
    const nextItems = await fetchCoils();
    setItems(nextItems);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetchCoils().then((nextItems) => {
      if (!cancelled) {
        setItems(nextItems);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, search]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/coils", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setFormError(data?.error?.message ?? "Не удалось создать рулон");
        return;
      }

      setForm(EMPTY_FORM);
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const action = active ? "restore" : "deactivate";
    await fetch(`/api/admin/coils/${id}/${action}`, { method: "POST" });
    await reload();
  }

  function startEdit(item: CoilItem) {
    setEditingId(item.id);
    setEditError(null);
    setEditForm({
      colorId: item.color.id,
      thicknessId: item.thickness.id,
      manufacturerId: item.manufacturer.id,
      coatingId: item.coating.id,
    });
  }

  async function saveEdit(id: string) {
    setEditError(null);
    const response = await fetch(`/api/admin/coils/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setEditError(data?.error?.message ?? "Не удалось сохранить изменения");
      return;
    }

    setEditingId(null);
    await reload();
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ fontSize: "1.5rem", color: "var(--text-primary)", margin: "0 0 1.25rem" }}>Рулоны</h1>

      <form
        onSubmit={handleCreate}
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
        <RefSelect
          label="Цвет RAL"
          options={refs.colors}
          value={form.colorId}
          onChange={(v) => setForm((prev) => ({ ...prev, colorId: v }))}
        />
        <RefSelect
          label="Толщина"
          options={refs.thicknesses}
          value={form.thicknessId}
          onChange={(v) => setForm((prev) => ({ ...prev, thicknessId: v }))}
        />
        <RefSelect
          label="Производитель"
          options={refs.manufacturers}
          value={form.manufacturerId}
          onChange={(v) => setForm((prev) => ({ ...prev, manufacturerId: v }))}
        />
        <RefSelect
          label="Покрытие"
          options={refs.coatings}
          value={form.coatingId}
          onChange={(v) => setForm((prev) => ({ ...prev, coatingId: v }))}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--brand-primary)",
            border: "1px solid var(--border)",
            color: "var(--on-brand)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Добавить рулон
        </button>
      </form>
      {formError && <p style={{ color: "var(--danger)" }}>{formError}</p>}

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center", color: "var(--text-secondary)" }}>
        <label>
          Показать:{" "}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
            style={{ backgroundColor: "var(--bg-card-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", padding: "0.35rem 0.5rem" }}
          >
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
            <option value="all">Все</option>
          </select>
        </label>
        <label>
          Поиск:{" "}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="код, название…"
            style={{ padding: "0.35rem 0.5rem", backgroundColor: "var(--bg-card-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
          />
        </label>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Загрузка…</p>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", backgroundColor: "var(--bg-card)" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1.4fr 1fr 140px 240px",
              padding: "0.65rem 1rem",
              backgroundColor: "var(--bg-header)",
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {["RAL", "Толщина", "Производитель", "Покрытие", "Статус", ""].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          {items.length === 0 && (
            <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Нет рулонов
            </div>
          )}
          {items.map((item, i) =>
            editingId === item.id ? (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1.4fr 1fr 140px 240px",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card-2)",
                }}
              >
                <RefSelect
                  label="Цвет RAL"
                  options={refs.colors}
                  value={editForm.colorId}
                  onChange={(v) => setEditForm((prev) => ({ ...prev, colorId: v }))}
                />
                <RefSelect
                  label="Толщина"
                  options={refs.thicknesses}
                  value={editForm.thicknessId}
                  onChange={(v) => setEditForm((prev) => ({ ...prev, thicknessId: v }))}
                />
                <RefSelect
                  label="Производитель"
                  options={refs.manufacturers}
                  value={editForm.manufacturerId}
                  onChange={(v) => setEditForm((prev) => ({ ...prev, manufacturerId: v }))}
                />
                <RefSelect
                  label="Покрытие"
                  options={refs.coatings}
                  value={editForm.coatingId}
                  onChange={(v) => setEditForm((prev) => ({ ...prev, coatingId: v }))}
                />
                {editError && <p style={{ color: "var(--danger)" }}>{editError}</p>}
                <StatusPill active={item.active} />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="button" onClick={() => saveEdit(item.id)} style={buttonStyle}>
                    Сохранить
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} style={buttonStyle}>
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1.4fr 1fr 140px 240px",
                  alignItems: "center",
                  padding: "0.7rem 1rem",
                  backgroundColor: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-card-2)",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.9rem",
                }}
              >
                <span style={{ color: "var(--text-primary)" }}>{item.color.displayName}</span>
                <span style={{ color: "var(--text-secondary)" }}>{item.thickness.displayName}</span>
                <span style={{ color: "var(--text-secondary)" }}>{item.manufacturer.displayName}</span>
                <span style={{ color: "var(--text-secondary)" }}>{item.coating.displayName}</span>
                <StatusPill active={item.active} />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <Link href={`/coil/${item.id}`} target="_blank" style={{ color: "var(--link)", textDecoration: "none", fontSize: "0.8rem" }}>
                      Открыть
                    </Link>
                    <Link href={`/admin/coils/${item.id}/print`} target="_blank" style={{ color: "var(--link)", textDecoration: "none", fontSize: "0.8rem" }}>
                      Печать
                    </Link>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="button" onClick={() => startEdit(item)} style={{ ...buttonStyle, padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}>
                      Изменить
                    </button>
                    <button type="button" onClick={() => toggleActive(item.id, !item.active)} style={{ ...buttonStyle, padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}>
                      {item.active ? "Деактивировать" : "Восстановить"}
                    </button>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
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
  whiteSpace: "nowrap",
};
