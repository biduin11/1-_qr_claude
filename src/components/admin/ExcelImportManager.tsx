"use client";

import { useState } from "react";
import { Download, FileUp } from "lucide-react";

import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/admin/StatusPill";

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
      <PageHeader title="Импорт рулонов из Excel" />

      <AdminCard style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.85rem" }}>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ color: "var(--text-secondary)", fontSize: "var(--text-2)" }}
          />
          <AdminButton type="button" variant="primary" icon={<FileUp size={15} />} onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Загрузка…" : "Загрузить и проверить"}
          </AdminButton>
        </div>
        <a
          href="/api/admin/export/excel-template"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "var(--link)", fontSize: "var(--text-2)", textDecoration: "none" }}
        >
          <Download size={14} aria-hidden />
          Скачать шаблон (.xlsx)
        </a>
      </AdminCard>

      {error && <p style={{ color: "var(--danger)", fontSize: "var(--text-2)" }}>{error}</p>}

      {preview && (
        <div>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-3)" }}>
            Всего строк: {preview.totalRows}, корректных: {preview.validRows}, с ошибками: {preview.invalidRows}
          </p>
          <div className="admin-table" style={{ marginBottom: "1.25rem" }}>
            <div className="admin-table-head" style={{ gridTemplateColumns: "80px 140px 1fr", gap: "1.5rem" }}>
              <span style={{ textAlign: "right" }}>Строка</span>
              <span>Статус</span>
              <span>Детали</span>
            </div>
            {preview.rows.map((row) => (
              <div key={row.rowNumber} className="admin-table-row" style={{ gridTemplateColumns: "80px 140px 1fr", gap: "1.5rem" }}>
                <span className="mono" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {row.rowNumber}
                </span>
                <StatusPill tone={row.status === "valid" ? "success" : "danger"} label={row.status === "valid" ? "Корректна" : "Ошибка"} />
                <span style={{ color: row.status === "invalid" ? "var(--danger)" : "var(--text-secondary)" }}>
                  {row.status === "invalid" ? row.errors.join("; ") : "—"}
                </span>
              </div>
            ))}
          </div>
          <AdminButton type="button" variant="primary" onClick={handleConfirm} disabled={confirming || preview.validRows === 0}>
            {confirming ? "Импорт…" : `Импортировать (${preview.validRows})`}
          </AdminButton>
        </div>
      )}

      {report && (
        <AdminCard>
          <p style={{ color: "var(--text-primary)", fontSize: "var(--text-3)", margin: 0 }}>
            Импортировано: {report.imported}, пропущено: {report.skipped}
          </p>
          {report.skippedRows.length > 0 && (
            <ul style={{ color: "var(--text-secondary)", fontSize: "var(--text-2)", paddingLeft: "1.2rem" }}>
              {report.skippedRows.map((row, index) => (
                <li key={index}>{row.reason}</li>
              ))}
            </ul>
          )}
        </AdminCard>
      )}
    </div>
  );
}
