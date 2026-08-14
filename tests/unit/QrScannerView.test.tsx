// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { instances, startState } = vi.hoisted(() => ({
  instances: [] as FakeQrScannerInstance[],
  startState: { shouldFail: false },
}));

type FakeQrScannerInstance = {
  onDecode: (result: { data: string }) => void;
  started: boolean;
  stopped: boolean;
  destroyed: boolean;
  start: () => Promise<void>;
  stop: () => void;
  destroy: () => void;
};

vi.mock("qr-scanner", () => {
  class FakeQrScanner implements FakeQrScannerInstance {
    onDecode: (result: { data: string }) => void;
    started = false;
    stopped = false;
    destroyed = false;

    constructor(_video: unknown, onDecode: (result: { data: string }) => void) {
      this.onDecode = onDecode;
      instances.push(this);
    }

    start(): Promise<void> {
      if (startState.shouldFail) {
        return Promise.reject(new Error("Permission denied"));
      }
      this.started = true;
      return Promise.resolve();
    }

    stop(): void {
      this.stopped = true;
    }

    destroy(): void {
      this.destroyed = true;
    }
  }

  return { default: FakeQrScanner };
});

const { QrScannerView } = await import("@/components/worker/QrScannerView");

describe("QrScannerView (мок qr-scanner)", () => {
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
      instance.onDecode({ data: "https://example.com/coil/abc" });
    });

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith("https://example.com/coil/abc");
    expect(instance.stopped).toBe(true);
  });

  it("повторное срабатывание на тот же QR не вызывает onScan снова (пункт 16 чек-листа)", async () => {
    const onScan = vi.fn();
    render(<QrScannerView instructions="test" validate={() => true} onScan={onScan} onCancel={vi.fn()} />);
    await waitFor(() => expect(instances).toHaveLength(1));
    const instance = instances[0]!;

    act(() => {
      instance.onDecode({ data: "same-value" });
      instance.onDecode({ data: "same-value" });
      instance.onDecode({ data: "same-value" });
    });

    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it("нераспознанный QR (validate=false) -> onScan не вызывается, сканирование продолжается (пункт 9 чек-листа)", async () => {
    const onScan = vi.fn();
    const validate = vi.fn(() => false);
    render(<QrScannerView instructions="test" validate={validate} onScan={onScan} onCancel={vi.fn()} />);
    await waitFor(() => expect(instances).toHaveLength(1));
    const instance = instances[0]!;

    act(() => {
      instance.onDecode({ data: "https://evil.example.com/anything" });
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
      instance.onDecode({ data: "invalid" });
      instance.onDecode({ data: "valid" });
    });

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith("valid");
  });

  it("останавливает и уничтожает сканер при размонтировании", async () => {
    const { unmount } = render(
      <QrScannerView instructions="test" validate={() => true} onScan={vi.fn()} onCancel={vi.fn()} />,
    );
    await waitFor(() => expect(instances).toHaveLength(1));
    const instance = instances[0]!;

    unmount();

    expect(instance.stopped).toBe(true);
    expect(instance.destroyed).toBe(true);
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
