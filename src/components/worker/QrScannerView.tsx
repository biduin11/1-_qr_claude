"use client";

import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";

/**
 * Встроенный веб-сканер QR (раздел 15 ТЗ). Декодирование — qr-scanner
 * (Web Worker, не блокирует UI; не завязан на BarcodeDetector, которого нет
 * в WebKit/iOS — ARCHITECTURE.md §10). Требует защищённый контекст (HTTPS
 * или localhost) — без него getUserMedia недоступен браузеру в принципе.
 *
 * `validate` решает, распознан ли QR как "свой" (только /coil/:id или только
 * /check — раздел 8 ТЗ, пункт 9 чек-листа); нераспознанный QR не прерывает
 * сканирование, просто показывает подсказку и ждёт следующий кадр.
 *
 * Однократное срабатывание на кадр: как только валидный QR подтверждён,
 * сканер сразу останавливается и onScan вызывается ровно один раз — защита
 * от повторного срабатывания на том же QR в кадре (пункт 16 чек-листа).
 */
export function QrScannerView({
  validate,
  onScan,
  instructions,
}: {
  validate: (rawValue: string) => boolean;
  onScan: (rawValue: string) => void;
  instructions: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rejectedValue, setRejectedValue] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    let handled = false;
    let cancelled = false;

    const scanner = new QrScanner(
      video,
      (result: QrScanner.ScanResult) => {
        if (handled || cancelled) return;
        const raw = result.data;

        if (!validate(raw)) {
          setRejectedValue(raw);
          return;
        }

        handled = true;
        setRejectedValue(null);
        scanner.stop();
        onScan(raw);
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
      },
    );

    scanner.start().catch((error: unknown) => {
      if (!cancelled) {
        setCameraError(error instanceof Error ? error.message : "Не удалось получить доступ к камере");
      }
    });

    return () => {
      cancelled = true;
      scanner.stop();
      scanner.destroy();
    };
    // validate/onScan подставляются один раз при монтировании — пересоздавать
    // сканер при каждом ререндере не нужно и создавало бы гонки за камеру.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cameraError) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ color: "#b00020", fontSize: "1.1rem" }}>Не удалось получить доступ к камере</p>
        <p style={{ color: "#666" }}>{cameraError}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <p style={{ fontSize: "1.1rem", textAlign: "center" }}>{instructions}</p>
      <video ref={videoRef} style={{ width: "100%", maxWidth: 480, borderRadius: 8 }} muted playsInline />
      {rejectedValue && (
        <p style={{ color: "#b00020", textAlign: "center" }}>
          Это не тот QR-код — попробуйте отсканировать нужный
        </p>
      )}
    </div>
  );
}
