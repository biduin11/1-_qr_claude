// @vitest-environment jsdom
import "fake-indexeddb/auto";

import { cleanup, render, screen } from "@testing-library/react";
import { del, set } from "idb-keyval";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicCoil } from "@/lib/public/coil";
import { ACTIVE_REQUIREMENT_STORAGE_KEY } from "@/lib/worker/active-requirement";
import type { ActiveMaterialRequirement } from "@/lib/worker/active-requirement";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const { CoilVerdict } = await import("@/components/worker/CoilVerdict");

const requirement: ActiveMaterialRequirement = {
  ral: "7024",
  ralDisplayName: "RAL 7024",
  thicknessHundredths: 50,
  thicknessDisplayName: "0,50 мм",
  manufacturer: "UZBEKISTAN",
  manufacturerDisplayName: "Узбекистан",
  coating: "VIKING",
  coatingDisplayName: "Viking",
  createdAt: "2026-08-12T00:00:00.000Z",
  expiresAt: null,
};

const matchingCoil: PublicCoil = {
  id: "coil-1",
  active: true,
  ral: { code: "7024", displayName: "RAL 7024" },
  thickness: { valueHundredths: 50, displayName: "0,50 мм" },
  manufacturer: { code: "UZBEKISTAN", displayName: "Узбекистан" },
  coating: { code: "VIKING", displayName: "Viking" },
};

const initialCoil = {
  ral: matchingCoil.ral,
  thickness: matchingCoil.thickness,
  manufacturer: matchingCoil.manufacturer,
  coating: matchingCoil.coating,
};

function mockFetchOnce(response: { status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: response.status,
      json: async () => response.body,
    }),
  );
}

describe("CoilVerdict (jsdom + fake-indexeddb + мок fetch)", () => {
  beforeEach(() => {
    push.mockClear();
  });

  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await del(ACTIVE_REQUIREMENT_STORAGE_KEY);
  });

  it("без активного требования -> read-only карточка, без запроса к API", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(<CoilVerdict id="coil-1" initialCoil={initialCoil} />);

    await screen.findByText("Рулон");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("полное совпадение -> MATCH (раздел 17 ТЗ, пункт 1 чек-листа)", async () => {
    await set(ACTIVE_REQUIREMENT_STORAGE_KEY, requirement);
    mockFetchOnce({ status: 200, body: matchingCoil });

    render(<CoilVerdict id="coil-1" initialCoil={initialCoil} />);

    await screen.findByText("РУЛОН ПОДХОДИТ");
    expect(screen.getByText("МОЖНО ИСПОЛЬЗОВАТЬ")).toBeTruthy();
  });

  it("несовпадение по RAL -> MISMATCH с деталями именно по этому полю (пункт 2 чек-листа)", async () => {
    await set(ACTIVE_REQUIREMENT_STORAGE_KEY, requirement);
    mockFetchOnce({
      status: 200,
      body: { ...matchingCoil, ral: { code: "9003", displayName: "RAL 9003" } },
    });

    render(<CoilVerdict id="coil-1" initialCoil={initialCoil} />);

    await screen.findByText("СТОП — РУЛОН НЕ ПОДХОДИТ");
    expect(screen.getByText("Нужно: RAL 7024")).toBeTruthy();
    expect(screen.getByText("На рулоне: RAL 9003")).toBeTruthy();
  });

  it("все 4 поля не совпадают -> показаны все 4 (пункт 6 чек-листа)", async () => {
    await set(ACTIVE_REQUIREMENT_STORAGE_KEY, requirement);
    mockFetchOnce({
      status: 200,
      body: {
        ...matchingCoil,
        ral: { code: "9003", displayName: "RAL 9003" },
        thickness: { valueHundredths: 45, displayName: "0,45 мм" },
        manufacturer: { code: "SEVERSTAL", displayName: "Северсталь" },
        coating: { code: "MATTE", displayName: "Matte" },
      },
    });

    render(<CoilVerdict id="coil-1" initialCoil={initialCoil} />);

    await screen.findByText("СТОП — РУЛОН НЕ ПОДХОДИТ");
    expect(screen.getByText("Нужно: RAL 7024")).toBeTruthy();
    expect(screen.getByText("Нужно: 0,50 мм")).toBeTruthy();
    expect(screen.getByText("Нужно: Узбекистан")).toBeTruthy();
    expect(screen.getByText("Нужно: Viking")).toBeTruthy();
  });

  it("рулон не найден (404) -> РУЛОН НЕ НАЙДЕН (пункт 7 чек-листа)", async () => {
    await set(ACTIVE_REQUIREMENT_STORAGE_KEY, requirement);
    mockFetchOnce({ status: 404, body: { error: { code: "COIL_NOT_FOUND" } } });

    render(<CoilVerdict id="coil-1" initialCoil={initialCoil} />);

    await screen.findByText("РУЛОН НЕ НАЙДЕН");
  });

  it("рулон деактивирован между SSR и клиентской проверкой -> РУЛОН НЕДОСТУПЕН (пункт 8 чек-листа)", async () => {
    await set(ACTIVE_REQUIREMENT_STORAGE_KEY, requirement);
    mockFetchOnce({ status: 410, body: { ...matchingCoil, active: false } });

    render(<CoilVerdict id="coil-1" initialCoil={initialCoil} />);

    await screen.findByText("РУЛОН НЕДОСТУПЕН");
  });

  it("сеть недоступна -> НЕТ СВЯЗИ, не разрешает по SSR-данным (раздел 32 ТЗ, пункт 12 чек-листа)", async () => {
    await set(ACTIVE_REQUIREMENT_STORAGE_KEY, requirement);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<CoilVerdict id="coil-1" initialCoil={initialCoil} />);

    await screen.findByText(/НЕТ СВЯЗИ/);
  });
});
