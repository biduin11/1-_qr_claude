"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

type PreviewRow =
  | { rowNumber: number; status: "valid"; colorId: string; thicknessId: string; manufacturerId: string; coatingId: string }
  | { rowNumber: number; status: "invalid"; errors: string[] };

type PreviewResponse = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: PreviewRow[];
};

type ConfirmResponse = {
  imported: number;
  skipped: number;
  skippedRows: Array<{ reason: string }>;
};

type ApiErrorBody = { error?: { message?: string } };

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        borderRadius: "999px",
        padding: "0.2rem 0.55rem",
        fontSize: "0.7rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {ok ? (
        <>
          <span style={{ width: 6, height: 6, borderRadius: "999px", backgroundColor: "var(--success)" }} />
          <span style={{ color: "var(--success)" }}>Корректна</span>
        </>
      ) : (
        <>
          <span style={{ width: 6, height: 6, borderRadius: "999px", backgroundColor: "var(--danger)" }} />
          <span style={{ color: "var(--danger)" }}>Ошибка</span>
        </>
      )}
    </span>
  );
}

export function ExcelImportManager() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [report, setReport] = useState<ConfirmResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setPreview(null);
    setReport(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/import/parse", { method: "POST", body: formData });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setError(data?.error?.message ?? "Не удалось загрузить файл");
        return;
      }

      const data = (await response.json()) as PreviewResponse;
      setPreview(data);
      setIdempotencyKey(crypto.randomUUID());
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirm() {
    if (!preview || !idempotencyKey) return;
    setConfirming(true);
    setError(null);

    try {
      const validRows = preview.rows.filter(
        (row): row is Extract<PreviewRow, { status: "valid" }> => row.status === "valid",
      );

      const response = await fetch("/api/admin/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          rows: validRows.map(({ colorId, thicknessId, manufacturerId, coatingId }) => ({
            colorId,
            thicknessId,
            manufacturerId,
            coatingId,
          })),
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setError(data?.error?.message ?? "Не удалось выполнить импорт");
        return;
      }

      const data = (await response.json()) as ConfirmResponse;
      setReport(data);
      setPreview(null);
      setIdempotencyKey(null);
      setFile(null);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <h1 style={{ fontSize: "1.5rem", color: "var(--text-primary)", margin: "0 0 0.75rem" }}>Импорт рулонов из Excel</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
        <a href="/api/admin/export/excel-template" style={{ color: "var(--link)" }}>
          Скачать шаблон (.xlsx)
        </a>
      </p>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem", padding: "1rem", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ color: "var(--text-secondary)" }}
        />
        <button type="button" onClick={handleUpload} disabled={!file || uploading} style={{ ...buttonStyle, backgroundColor: "var(--brand-primary)", color: "var(--on-brand)" }}>
          {uploading ? "Загрузка…" : "Загрузить и проверить"}
        </button>
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      {preview && (
        <div>
          <p style={{ color: "var(--text-secondary)" }}>
            Всего строк: {preview.totalRows}, корректных: {preview.validRows}, с ошибками:{" "}
            {preview.invalidRows}
          </p>
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", backgroundColor: "var(--bg-card)", marginBottom: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 140px 1fr", padding: "0.65rem 1rem", backgroundColor: "var(--bg-header)", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>
              <span>Строка</span>
              <span>Статус</span>
              <span>Детали</span>
            </div>
            {preview.rows.map((row, i) => (
              <div key={row.rowNumber} style={{ display: "grid", gridTemplateColumns: "80px 140px 1fr", alignItems: "center", padding: "0.55rem 1rem", backgroundColor: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-card-2)", borderBottom: "1px solid var(--border)", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{row.rowNumber}</span>
                <StatusBadge ok={row.status === "valid"} />
                <span style={{ color: row.status === "invalid" ? "var(--danger)" : "var(--text-secondary)" }}>
                  {row.status === "invalid" ? row.errors.join("; ") : "—"}
                </span>
              </div>
            ))}
          </div>
          <button type="button" onClick={handleConfirm} disabled={confirming || preview.validRows === 0} style={{ ...buttonStyle, backgroundColor: "var(--brand-primary)", color: "var(--on-brand)" }}>
            {confirming ? "Импорт…" : `Импортировать (${preview.validRows})`}
          </button>
        </div>
      )}

      {report && (
        <div style={{ padding: "1rem", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
          <p style={{ color: "var(--text-primary)" }}>
            Импортировано: {report.imported}, пропущено: {report.skipped}
          </p>
          {report.skippedRows.length > 0 && (
            <ul style={{ color: "var(--text-secondary)" }}>
              {report.skippedRows.map((row, index) => (
                <li key={index}>{row.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const buttonStyle: CSSProperties = {
  padding: "0.45rem 1.1rem",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--bg-card-2)",
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "0.85rem",
};
