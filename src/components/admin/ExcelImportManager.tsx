"use client";

import { useState } from "react";

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
    <div>
      <h1>Импорт рулонов из Excel</h1>
      <p>
        <a href="/api/admin/export/excel-template">Скачать шаблон (.xlsx)</a>
      </p>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="button" onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Загрузка…" : "Загрузить и проверить"}
        </button>
      </div>

      {error && <p style={{ color: "#b00020" }}>{error}</p>}

      {preview && (
        <div>
          <p>
            Всего строк: {preview.totalRows}, корректных: {preview.validRows}, с ошибками:{" "}
            {preview.invalidRows}
          </p>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "1rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.4rem" }}>
                  Строка
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.4rem" }}>
                  Статус
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.4rem" }}>
                  Детали
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>{row.rowNumber}</td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>
                    {row.status === "valid" ? "Корректна" : "Ошибка"}
                  </td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>
                    {row.status === "invalid" ? row.errors.join("; ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={handleConfirm} disabled={confirming || preview.validRows === 0}>
            {confirming ? "Импорт…" : `Импортировать (${preview.validRows})`}
          </button>
        </div>
      )}

      {report && (
        <div>
          <p>
            Импортировано: {report.imported}, пропущено: {report.skipped}
          </p>
          {report.skippedRows.length > 0 && (
            <ul>
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
