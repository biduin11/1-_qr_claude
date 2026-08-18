import { PrintButton } from "@/components/admin/PrintButton";
import { getConfig } from "@/lib/config";
import { getPublicCoil } from "@/lib/public/coil";
import { buildCoilPublicUrl, generateCoilQrSvg } from "@/lib/qr/coil-passport";

/** Паспорт рулона для печати (Iteration 8, раздел 15 ТЗ) — QR + характеристики. */
export default async function CoilPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coil = await getPublicCoil(id);

  if (!coil) {
    return <p>Рулон не найден.</p>;
  }

  const url = buildCoilPublicUrl(getConfig().NEXT_PUBLIC_APP_URL, coil.id);
  const qrSvg = await generateCoilQrSvg(url);

  return (
    <div>
      <div className="no-print" style={{ marginBottom: "1.5rem" }}>
        <PrintButton />
      </div>

      <div
        className="print-page"
        style={{
          maxWidth: 380,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          textAlign: "center",
          backgroundColor: "var(--bg-card)",
          color: "var(--text-primary)",
        }}
      >
        <h1 style={{ fontSize: "1.1rem", marginTop: 0 }}>Паспорт рулона</h1>

        {/* Собственный серверный SVG (src/lib/qr/coil-passport.ts), не пользовательский ввод. */}
        <div style={{ width: 220, margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: qrSvg }} />

        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            rowGap: "0.5rem",
            fontSize: "1rem",
            textAlign: "left",
            marginTop: "1.5rem",
          }}
        >
          <dt style={{ color: "var(--text-secondary)" }}>Цвет</dt>
          <dd style={{ margin: 0, textAlign: "right", fontWeight: 600, fontFamily: "var(--font-mono)" }}>RAL {coil.ral.code}</dd>

          <dt style={{ color: "var(--text-secondary)" }}>Толщина</dt>
          <dd style={{ margin: 0, textAlign: "right", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{coil.thickness.displayName}</dd>

          <dt style={{ color: "var(--text-secondary)" }}>Производитель</dt>
          <dd style={{ margin: 0, textAlign: "right", fontWeight: 600 }}>{coil.manufacturer.displayName}</dd>

          <dt style={{ color: "var(--text-secondary)" }}>Покрытие</dt>
          <dd style={{ margin: 0, textAlign: "right", fontWeight: 600 }}>{coil.coating.displayName}</dd>
        </dl>

        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem", marginBottom: 0, wordBreak: "break-all", fontFamily: "var(--font-mono)" }}>
          {coil.id}
        </p>
      </div>
    </div>
  );
}
