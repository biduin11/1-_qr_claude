"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

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
    <label style={{ display: "flex", flexDirection: "column", fontSize: "0.85rem" }}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} required style={{ padding: "0.4rem" }}>
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
    <div>
      <h1>Рулоны</h1>

      <form
        onSubmit={handleCreate}
        style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "1.5rem" }}
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
        <button type="submit" disabled={submitting} style={{ padding: "0.5rem 1rem" }}>
          Добавить рулон
        </button>
      </form>
      {formError && <p style={{ color: "#b00020" }}>{formError}</p>}

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" }}>
        <label>
          Показать:{" "}
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}>
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
            style={{ padding: "0.3rem" }}
          />
        </label>
      </div>

      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {["RAL", "Толщина", "Производитель", "Покрытие", "Статус", ""].map((label) => (
                <th key={label} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.4rem" }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "0.5rem", color: "#666" }}>
                  Нет рулонов
                </td>
              </tr>
            )}
            {items.map((item) =>
              editingId === item.id ? (
                <tr key={item.id}>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }} colSpan={4}>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
                    </div>
                    {editError && <p style={{ color: "#b00020" }}>{editError}</p>}
                  </td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>
                    {item.active ? "Активен" : "Неактивен"}
                  </td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>
                    <button type="button" onClick={() => saveEdit(item.id)}>
                      Сохранить
                    </button>{" "}
                    <button type="button" onClick={() => setEditingId(null)}>
                      Отмена
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={item.id}>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>{item.color.displayName}</td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>{item.thickness.displayName}</td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>{item.manufacturer.displayName}</td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>{item.coating.displayName}</td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>
                    {item.active ? "Активен" : "Неактивен"}
                  </td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>
                    <Link href={`/coil/${item.id}`} target="_blank">
                      Открыть
                    </Link>{" "}
                    <Link href={`/admin/coils/${item.id}/print`} target="_blank">
                      Печать
                    </Link>{" "}
                    <button type="button" onClick={() => startEdit(item)}>
                      Изменить
                    </button>{" "}
                    <button type="button" onClick={() => toggleActive(item.id, !item.active)}>
                      {item.active ? "Деактивировать" : "Восстановить"}
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
