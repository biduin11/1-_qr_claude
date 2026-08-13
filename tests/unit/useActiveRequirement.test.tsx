// @vitest-environment jsdom
import "fake-indexeddb/auto";

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { del } from "idb-keyval";
import { afterEach, describe, expect, it } from "vitest";

import { useActiveRequirement } from "@/hooks/useActiveRequirement";
import { ACTIVE_REQUIREMENT_STORAGE_KEY } from "@/lib/worker/active-requirement";
import type { ActiveMaterialRequirement } from "@/lib/worker/active-requirement";

const sample: ActiveMaterialRequirement = {
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

const other: ActiveMaterialRequirement = {
  ...sample,
  ral: "9003",
  ralDisplayName: "RAL 9003",
  createdAt: "2026-08-12T01:00:00.000Z",
};

describe("useActiveRequirement (jsdom + fake-indexeddb)", () => {
  afterEach(async () => {
    cleanup();
    await del(ACTIVE_REQUIREMENT_STORAGE_KEY);
  });

  it("loaded становится true, requirement/initialRequirement — null, если в IndexedDB пусто", async () => {
    const { result } = renderHook(() => useActiveRequirement());

    expect(result.current.loaded).toBe(false);

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.requirement).toBeNull();
    expect(result.current.initialRequirement).toBeNull();
  });

  it("save() сохраняет и сразу отражается в requirement", async () => {
    const { result } = renderHook(() => useActiveRequirement());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.save(sample);
    });

    expect(result.current.requirement).toEqual(sample);
  });

  it("clear() удаляет требование", async () => {
    const { result } = renderHook(() => useActiveRequirement());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.save(sample);
    });
    expect(result.current.requirement).toEqual(sample);

    await act(async () => {
      await result.current.clear();
    });
    expect(result.current.requirement).toBeNull();
  });

  it("save() не изменяет уже сделанный снимок initialRequirement", async () => {
    const { result } = renderHook(() => useActiveRequirement());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.initialRequirement).toBeNull();

    await act(async () => {
      await result.current.save(sample);
    });

    // requirement обновился, а initialRequirement — стабильный снимок на момент загрузки.
    expect(result.current.requirement).toEqual(sample);
    expect(result.current.initialRequirement).toBeNull();
  });

  it("предзаписанное в IndexedDB значение подхватывается как initialRequirement при монтировании нового хука", async () => {
    // Сначала один хук пишет значение...
    const first = renderHook(() => useActiveRequirement());
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    await act(async () => {
      await first.result.current.save(other);
    });
    first.unmount();

    // ...затем новый (имитация нового захода на /check) должен увидеть его как initialRequirement.
    const second = renderHook(() => useActiveRequirement());
    await waitFor(() => expect(second.result.current.loaded).toBe(true));

    expect(second.result.current.requirement).toEqual(other);
    expect(second.result.current.initialRequirement).toEqual(other);
  });
});
