"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Pencil, Plus, PowerOff, RotateCcw, Search, X } from "lucide-react";

import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/admin/StatusPill";

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

const GRID_COLUMNS = "1.2fr 1fr 1.4fr 1fr 140px minmax(300px, max-content)";

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
    <label className="admin-field" style={{ flex: "1 1 200px", minWidth: 180 }}>
      <span className="admin-field-label">{label}</span>
      <AdminSelect value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="" disabled>
          — выбрать —
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.displayName}
          </option>
        ))}
      </AdminSelect>
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
    <div style={{ maxWidth: 1280 }}>
      <PageHeader title="Рулоны" description="Журнал рулонов металла и их статус проверки" />

      <AdminCard style={{ marginBottom: "1.5rem" }}>
        <form onSubmit={handleCreate} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
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
          <AdminButton type="submit" variant="primary" icon={<Plus size={15} />} disabled={submitting}>
            Добавить рулон
          </AdminButton>
        </form>
        {formError && (
          <p style={{ color: "var(--danger)", fontSize: "var(--text-2)", margin: "0.75rem 0 0" }}>{formError}</p>
        )}
      </AdminCard>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-2)", fontWeight: 500 }}>Показать:</span>
          <div style={{ width: 200 }}>
            <AdminSelect value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}>
              <option value="active">Активные</option>
              <option value="inactive">Неактивные</option>
              <option value="all">Все</option>
            </AdminSelect>
          </div>
        </div>
        <div style={{ position: "relative", width: 260 }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} aria-hidden />
          <input
            type="text"
            className="admin-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск: код, название…"
            style={{ paddingLeft: "2.25rem" }}
          />
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Загрузка…</p>
      ) : (
        <div className="admin-table">
          <div className="admin-table-head" style={{ gridTemplateColumns: GRID_COLUMNS, gap: "1.5rem" }}>
            {["RAL", "Толщина", "Производитель", "Покрытие", "Статус", "Действия"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          {items.length === 0 && <div className="admin-table-empty">Нет рулонов</div>}
          {items.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div key={item.id}>
                <div className="admin-table-row" style={{ gridTemplateColumns: GRID_COLUMNS, gap: "1.5rem" }}>
                  {isEditing ? (
                    <>
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
                      <StatusPill tone={item.active ? "success" : "danger"} label={item.active ? "Активен" : "Неактивен"} />
                      <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <AdminButton
                          type="button"
                          size="sm"
                          variant="primary"
                          className="admin-btn-col-1"
                          icon={<Check size={13} />}
                          onClick={() => saveEdit(item.id)}
                        >
                          Сохранить
                        </AdminButton>
                        <AdminButton
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="admin-btn-col-2"
                          icon={<X size={13} />}
                          onClick={() => setEditingId(null)}
                        >
                          Отмена
                        </AdminButton>
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: "var(--text-primary)" }}>{item.color.displayName}</span>
                      <span style={{ color: "var(--text-secondary)" }}>{item.thickness.displayName}</span>
                      <span style={{ color: "var(--text-secondary)" }}>{item.manufacturer.displayName}</span>
                      <span style={{ color: "var(--text-secondary)" }}>{item.coating.displayName}</span>
                      <StatusPill tone={item.active ? "success" : "danger"} label={item.active ? "Активен" : "Неактивен"} />
                      <span style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <Link href={`/coil/${item.id}`} target="_blank" style={{ color: "var(--link)", textDecoration: "none", fontSize: "var(--text-2)" }}>
                            Открыть
                          </Link>
                          <Link
                            href={`/admin/coils/${item.id}/print`}
                            target="_blank"
                            style={{ color: "var(--link)", textDecoration: "none", fontSize: "var(--text-2)" }}
                          >
                            Печать
                          </Link>
                        </span>
                        {/* Разделяет навигацию (открыть/печать) от действий, меняющих
                            данные (изменить/деактивировать). */}
                        <span aria-hidden style={{ width: 1, height: 16, flexShrink: 0, backgroundColor: "var(--border-strong)" }} />
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
                        </span>
                      </span>
                    </>
                  )}
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
        </div>
      )}
    </div>
  );
}
