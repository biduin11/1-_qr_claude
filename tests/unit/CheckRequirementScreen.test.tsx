// @vitest-environment jsdom
import "fake-indexeddb/auto";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { del, get, set } from "idb-keyval";
import { afterEach, describe, expect, it } from "vitest";

import { CheckRequirementScreen } from "@/components/worker/CheckRequirementScreen";
import type { IncomingRequirement } from "@/components/worker/CheckRequirementScreen";
import { ACTIVE_REQUIREMENT_STORAGE_KEY } from "@/lib/worker/active-requirement";
import type { ActiveMaterialRequirement } from "@/lib/worker/active-requirement";

const existing: ActiveMaterialRequirement = {
  ral: "9003",
  ralDisplayName: "RAL 9003",
  thicknessHundredths: 45,
  thicknessDisplayName: "0,45 мм",
  manufacturer: "SEVERSTAL",
  manufacturerDisplayName: "Северсталь",
  coating: "MATTE",
  coatingDisplayName: "Matte",
  createdAt: "2026-08-12T00:00:00.000Z",
  expiresAt: null,
};

const incoming: IncomingRequirement = {
  ral: "7024",
  ralDisplayName: "RAL 7024",
  thicknessHundredths: 50,
  thicknessDisplayName: "0,50 мм",
  manufacturer: "UZBEKISTAN",
  manufacturerDisplayName: "Узбекистан",
  coating: "VIKING",
  coatingDisplayName: "Viking",
};

describe("CheckRequirementScreen (jsdom + fake-indexeddb)", () => {
  afterEach(async () => {
    cleanup();
    await del(ACTIVE_REQUIREMENT_STORAGE_KEY);
  });

  it("без существующего требования — сразу показывает 'ТРЕБУЕТСЯ РУЛОН' с новыми значениями и сохраняет их", async () => {
    render(<CheckRequirementScreen incoming={incoming} />);

    await screen.findByText("ТРЕБУЕТСЯ РУЛОН");
    expect(screen.getByText("RAL 7024")).toBeTruthy();

    // Кнопка сканирования рулона ведёт на /scan/coil (Iteration 6) — раньше
    // была disabled-заглушкой, стоит явно проверять, что она реально ссылка.
    const scanLink = screen.getByText("СКАНИРОВАТЬ РУЛОН").closest("a");
    expect(scanLink?.getAttribute("href")).toBe("/scan/coil");

    await waitFor(async () => {
      const stored = await get<ActiveMaterialRequirement>(ACTIVE_REQUIREMENT_STORAGE_KEY);
      expect(stored?.ral).toBe("7024");
    });
  });

  it("с существующим требованием — показывает экран конфликта, а не молча перезаписывает", async () => {
    await set(ACTIVE_REQUIREMENT_STORAGE_KEY, existing);

    render(<CheckRequirementScreen incoming={incoming} />);

    await screen.findByText("Есть незавершённая проверка");
    // Показаны значения СУЩЕСТВУЮЩЕГО требования, не новые.
    expect(screen.getByText("RAL 9003")).toBeTruthy();
    expect(screen.queryByText("ТРЕБУЕТСЯ РУЛОН")).toBeNull();

    // IndexedDB не тронута молчаливой перезаписью.
    const stored = await get<ActiveMaterialRequirement>(ACTIVE_REQUIREMENT_STORAGE_KEY);
    expect(stored?.ral).toBe("9003");
  });

  it("'Начать новую' — заменяет требование на новое", async () => {
    await set(ACTIVE_REQUIREMENT_STORAGE_KEY, existing);
    render(<CheckRequirementScreen incoming={incoming} />);

    await screen.findByText("Есть незавершённая проверка");
    fireEvent.click(screen.getByText("Начать новую"));

    await screen.findByText("ТРЕБУЕТСЯ РУЛОН");
    expect(screen.getByText("RAL 7024")).toBeTruthy();

    await waitFor(async () => {
      const stored = await get<ActiveMaterialRequirement>(ACTIVE_REQUIREMENT_STORAGE_KEY);
      expect(stored?.ral).toBe("7024");
    });
  });

  it("'Продолжить текущую' — оставляет старое требование нетронутым", async () => {
    await set(ACTIVE_REQUIREMENT_STORAGE_KEY, existing);
    render(<CheckRequirementScreen incoming={incoming} />);

    await screen.findByText("Есть незавершённая проверка");
    fireEvent.click(screen.getByText("Продолжить текущую"));

    await screen.findByText("ТРЕБУЕТСЯ РУЛОН");
    expect(screen.getByText("RAL 9003")).toBeTruthy();
    expect(screen.queryByText("RAL 7024")).toBeNull();

    const stored = await get<ActiveMaterialRequirement>(ACTIVE_REQUIREMENT_STORAGE_KEY);
    expect(stored?.ral).toBe("9003");
  });
});
