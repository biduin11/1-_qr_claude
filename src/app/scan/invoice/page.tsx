"use client";

import { useRouter } from "next/navigation";

import { QrScannerView } from "@/components/worker/QrScannerView";
import { parseCheckScanUrl } from "@/lib/worker/scan-url";

export default function ScanInvoicePage() {
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
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Сканирование накладной</h1>
      <QrScannerView
        instructions="Наведите камеру на QR-код на накладной"
        validate={(raw) => parseCheckScanUrl(raw, window.location.origin) !== null}
        onScan={(raw) => {
          const target = parseCheckScanUrl(raw, window.location.origin);
          if (target) router.push(target);
        }}
      />
    </main>
  );
}
