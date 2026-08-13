"use client";

import { useRouter } from "next/navigation";

import { QrScannerView } from "@/components/worker/QrScannerView";
import { parseCoilScanUrl } from "@/lib/worker/scan-url";

export default function ScanCoilPage() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "1rem",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Сканирование рулона</h1>
      <QrScannerView
        instructions="Наведите камеру на QR-код на рулоне"
        validate={(raw) => parseCoilScanUrl(raw, window.location.origin) !== null}
        onScan={(raw) => {
          const id = parseCoilScanUrl(raw, window.location.origin);
          if (id) router.push(`/coil/${id}`);
        }}
      />
    </main>
  );
}
