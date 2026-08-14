"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Встроенный веб-сканер QR (раздел 15 ТЗ). Декодирование — `html5-qrcode`
 * (движок ZXing поверх `getUserMedia`). Не `qr-scanner` (nimiq) — та
 * библиотека доказанно не декодирует кадры на iOS Safari/Chromium-на-iOS:
 * превью с камеры показывается нормально, ошибок нет, но QR никогда не
 * распознаётся (воспроизведено на реальном устройстве при проверке
 * Iteration 6/10; совпадает с давними открытыми issues в репозитории
 * nimiq/qr-scanner — #33, #58, #121). См. Decision Log ARCHITECTURE.md §15.
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
  onCancel,
  instructions,
}: {
  validate: (rawValue: string) => boolean;
  onScan: (rawValue: string) => void;
  /** Кнопка выхода со сканера без сканирования — раньше её не было вообще. */
  onCancel: () => void;
  instructions: string;
}) {
  // html5-qrcode рендерит video/canvas внутрь элемента с этим id сам — ему
  // нужен id, а не ref на конкретный узел. useId() даёт стабильный уникальный
  // id при гидратации; двоеточия из формата useId() заменены на дефисы —
  // библиотека использует id как CSS-селектор внутри себя, а двоеточие в
  // селекторе без экранирования ломает querySelector.
  const rawId = useId();
  const elementId = `qr-reader-${rawId.replace(/:/g, "-")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rejectedValue, setRejectedValue] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    let handled = false;
    let cancelled = false;
    const scanner = new Html5Qrcode(elementId, /* verbose */ false);

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (handled || cancelled) return;

          if (!validate(decodedText)) {
            setRejectedValue(decodedText);
            return;
          }

          handled = true;
          setRejectedValue(null);
          scanner.stop().then(() => scanner.clear()).catch(() => {});
          onScan(decodedText);
        },
        () => {
          // Вызывается на каждый кадр, где QR не найден — это норма при
          // непрерывном сканировании, не ошибка доступа к камере. Ничего
          // не делаем; отличие от cameraError ниже (там реальный сбой
          // старта — нет разрешения/нет камеры).
        },
      )
      .catch((error: unknown) => {
        if (!cancelled) {
          setCameraError(error instanceof Error ? error.message : "Не удалось получить доступ к камере");
        }
      });

    return () => {
      cancelled = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {
          // start() мог не успеть завершиться (или упасть) — тогда stop()
          // законно реджектит; сканер и так не запущен, чистить нечего.
        });
    };
    // validate/onScan подставляются один раз при монтировании — пересоздавать
    // сканер при каждом ререндере не нужно и создавало бы гонки за камеру.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId]);

  const cancelButton = (
    <button
      type="button"
      onClick={onCancel}
      style={{ padding: "0.5rem 1rem", alignSelf: "flex-start" }}
    >
      ← Отмена
    </button>
  );

  if (cameraError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "2rem" }}>
        {cancelButton}
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#b00020", fontSize: "1.1rem" }}>Не удалось получить доступ к камере</p>
          <p style={{ color: "#666" }}>{cameraError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      {cancelButton}
      <p style={{ fontSize: "1.1rem", textAlign: "center" }}>{instructions}</p>
      <div ref={containerRef} id={elementId} style={{ width: "100%", maxWidth: 480, borderRadius: 8, overflow: "hidden" }} />
      {rejectedValue && (
        <p style={{ color: "#b00020", textAlign: "center" }}>
          Это не тот QR-код — попробуйте отсканировать нужный
        </p>
      )}
    </div>
  );
}
