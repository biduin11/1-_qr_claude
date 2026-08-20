// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { instances, startState } = vi.hoisted(() => ({
  instances: [] as FakeHtml5QrcodeInstance[],
  startState: { shouldFail: false },
}));

type SuccessCallback = (decodedText: string) => void;

type FakeHtml5QrcodeInstance = {
  elementId: string;
  stopped: boolean;
  cleared: boolean;
  stopCallCount: number;
  onSuccess: SuccessCallback | null;
  start: (
    cameraIdOrConfig: unknown,
    configuration: unknown,
    qrCodeSuccessCallback: SuccessCallback,
    qrCodeErrorCallback: (errorMessage: string) => void,
  ) => Promise<null>;
  stop: () => Promise<void>;
  clear: () => void;
};

vi.mock("html5-qrcode", () => {
  // Реплика реального поведения html5-qrcode (проверено чтением исходников
  // node_modules/html5-qrcode/cjs/html5-qrcode.js): stop() на уже
  // остановленном/не запущенном сканере кидает СИНХРОННОЕ исключение
  // (обычную строку), не Promise-реджект — `if (!isScanning) throw "...".`
  // Старый мок этого не воспроизводил вообще (stop() всегда успешно
  // резолвился), поэтому тесты не могли поймать баг двойного stop() в
  // cleanup эффекта (см. QrScannerView.tsx, комментарий в cleanup).
  class FakeHtml5Qrcode implements FakeHtml5QrcodeInstance {
    elementId: string;
    stopped = false;
    cleared = false;
    stopCallCount = 0;
    isScanningState = false;
    onSuccess: SuccessCallback | null = null;

    constructor(elementId: string) {
      this.elementId = elementId;
      instances.push(this);
    }

    start(
      _cameraIdOrConfig: unknown,
      _configuration: unknown,
      qrCodeSuccessCallback: SuccessCallback,
    ): Promise<null> {
      if (startState.shouldFail) {
        return Promise.reject(new Error("Permission denied"));
      }
      this.onSuccess = qrCodeSuccessCallback;
      this.isScanningState = true;
      return Promise.resolve(null);
    }

    stop(): Promise<void> {
      this.stopCallCount += 1;
      if (!this.isScanningState) {
        // Буквально воспроизводит реальную библиотеку — throw строки, не Error.
        throw "Cannot stop, scanner is not running or paused.";
      }
      this.isScanningState = false;
      this.stopped = true;
      return Promise.resolve();
    }

    clear(): void {
      this.cleared = true;
    }
  }

  return { Html5Qrcode: FakeHtml5Qrcode };
});

const { QrScannerView } = await import("@/components/worker/QrScannerView");

describe("QrScannerView (мок html5-qrcode)", () => {
  afterEach(() => {
    cleanup();
    instances.length = 0;
    startState.shouldFail = false;
  });

  it("валидный QR -> onScan вызывается ровно один раз, сканер останавливается", async () => {
    const onScan = vi.fn();
    render(<QrScannerView instructions="test" validate={() => true} onScan={onScan} onCancel={vi.fn()} />);
    await waitFor(() => expect(instances).toHaveLength(1));
    const instance = instances[0]!;

    act(() => {
      instance.onSuccess?.("https://example.com/coil/abc");
    });

    // onScan теперь вызывается после того, как камера реально остановлена
    // (await stop()+clear()), не синхронно — ждём микротаск.
    await waitFor(() => expect(onScan).toHaveBeenCalledTimes(1));
    expect(onScan).toHaveBeenCalledWith("https://example.com/coil/abc");
    expect(instance.stopped).toBe(true);
  });

  it("размонтирование ПОСЛЕ успешного скана (эмулирует router.push -> unmount) не кидает исключение из cleanup — регрессия бага с Error Boundary на переходе /scan/coil -> /coil/:id", async () => {
    // До фикса: success-callback уже полностью останавливал сканер перед
    // onScan()/навигацией, а cleanup эффекта при последующем размонтировании
    // (когда React убирает QrScannerView со страницы после router.push)
    // безусловно звал scanner.stop() ЕЩЁ РАЗ. Реальный html5-qrcode.stop()
    // на уже остановленном сканере кидает синхронное исключение — .catch()
    // на промисе от него не защищает (throw происходит раньше, чем
    // появляется сам промис), и оно уходило необработанным из cleanup
    // прямо в Error Boundary. Мок теперь воспроизводит этот throw
    // (см. класс FakeHtml5Qrcode выше) — этот тест обязан был падать на
    // старой реализации QrScannerView и обязан проходить на новой.
    const onScan = vi.fn();
    const { unmount } = render(
      <QrScannerView instructions="test" validate={() => true} onScan={onScan} onCancel={vi.fn()} />,
    );
    await waitFor(() => expect(instances).toHaveLength(1));
    const instance = instances[0]!;

    act(() => {
      instance.onSuccess?.("https://example.com/coil/abc");
    });
    await waitFor(() => expect(onScan).toHaveBeenCalledTimes(1));
    expect(instance.stopCallCount).toBe(1);

    // Размонтирование не должно бросать (React перехватил бы синхронное
    // исключение из cleanup и это уронило бы unmount()/тест) и не должно
    // звать stop() второй раз — успешный путь уже сам отвечает за teardown.
    expect(() => unmount()).not.toThrow();
    expect(instance.stopCallCount).toBe(1);
  });

  it("повторное срабатывание на тот же QR не вызывает onScan снова (пункт 16 чек-листа)", async () => {
    const onScan = vi.fn();
    render(<QrScannerView instructions="test" validate={() => true} onScan={onScan} onCancel={vi.fn()} />);
    await waitFor(() => expect(instances).toHaveLength(1));
    const instance = instances[0]!;

    act(() => {
      instance.onSuccess?.("same-value");
      instance.onSuccess?.("same-value");
      instance.onSuccess?.("same-value");
    });

    await waitFor(() => expect(onScan).toHaveBeenCalledTimes(1));
  });

  it("нераспознанный QR (validate=false) -> onScan не вызывается, сканирование продолжается (пункт 9 чек-листа)", async () => {
    const onScan = vi.fn();
    const validate = vi.fn(() => false);
    render(<QrScannerView instructions="test" validate={validate} onScan={onScan} onCancel={vi.fn()} />);
    await waitFor(() => expect(instances).toHaveLength(1));
    const instance = instances[0]!;

    act(() => {
      instance.onSuccess?.("https://evil.example.com/anything");
    });

    expect(validate).toHaveBeenCalledWith("https://evil.example.com/anything");
    expect(onScan).not.toHaveBeenCalled();
    expect(instance.stopped).toBe(false);
    await screen.findByText(/не тот QR-код/i);
  });

  it("после отклонённого QR валидный всё равно срабатывает", async () => {
    const onScan = vi.fn();
    const validate = vi.fn((raw: string) => raw === "valid");
    render(<QrScannerView instructions="test" validate={validate} onScan={onScan} onCancel={vi.fn()} />);
    await waitFor(() => expect(instances).toHaveLength(1));
    const instance = instances[0]!;

    act(() => {
      instance.onSuccess?.("invalid");
      instance.onSuccess?.("valid");
    });

    await waitFor(() => expect(onScan).toHaveBeenCalledTimes(1));
    expect(onScan).toHaveBeenCalledWith("valid");
  });

  it("останавливает и уничтожает сканер при размонтировании", async () => {
    const { unmount } = render(
      <QrScannerView instructions="test" validate={() => true} onScan={vi.fn()} onCancel={vi.fn()} />,
    );
    await waitFor(() => expect(instances).toHaveLength(1));
    const instance = instances[0]!;

    unmount();
    await waitFor(() => expect(instance.stopped).toBe(true));
    await waitFor(() => expect(instance.cleared).toBe(true));
  });

  it("кнопка «Отмена» вызывает onCancel (раньше выйти со сканера без сканирования было нельзя)", async () => {
    const onCancel = vi.fn();
    render(<QrScannerView instructions="test" validate={() => true} onScan={vi.fn()} onCancel={onCancel} />);
    await waitFor(() => expect(instances).toHaveLength(1));

    fireEvent.click(screen.getByText("← Отмена"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("кнопка «Отмена» доступна и на экране ошибки доступа к камере", async () => {
    startState.shouldFail = true;
    const onCancel = vi.fn();
    render(<QrScannerView instructions="test" validate={() => true} onScan={vi.fn()} onCancel={onCancel} />);

    await screen.findByText(/не удалось получить доступ к камере/i);
    fireEvent.click(screen.getByText("← Отмена"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
