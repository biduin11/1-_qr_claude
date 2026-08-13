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
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "1.5rem",
          textAlign: "center",
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
          <dt style={{ color: "#666" }}>Цвет</dt>
          <dd style={{ margin: 0, textAlign: "right", fontWeight: 600 }}>RAL {coil.ral.code}</dd>

          <dt style={{ color: "#666" }}>Толщина</dt>
          <dd style={{ margin: 0, textAlign: "right", fontWeight: 600 }}>{coil.thickness.displayName}</dd>

          <dt style={{ color: "#666" }}>Производитель</dt>
          <dd style={{ margin: 0, textAlign: "right", fontWeight: 600 }}>{coil.manufacturer.displayName}</dd>

          <dt style={{ color: "#666" }}>Покрытие</dt>
          <dd style={{ margin: 0, textAlign: "right", fontWeight: 600 }}>{coil.coating.displayName}</dd>
        </dl>

        <p style={{ fontSize: "0.75rem", color: "#999", marginTop: "1rem", marginBottom: 0, wordBreak: "break-all" }}>
          {coil.id}
        </p>
      </div>
    </div>
  );
}
