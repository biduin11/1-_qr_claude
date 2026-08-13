"use client";

import { del, get, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";

import type { ActiveMaterialRequirement } from "@/lib/worker/active-requirement";
import { ACTIVE_REQUIREMENT_STORAGE_KEY } from "@/lib/worker/active-requirement";

/**
 * IndexedDB-обёртка над ActiveMaterialRequirement (ARCHITECTURE.md §6/§9).
 * `loaded=false` до первого чтения из IndexedDB — до этого момента нельзя
 * судить о наличии/отсутствии требования (пустое состояние ещё не отличимо
 * от "ещё не прочитали").
 */
export function useActiveRequirement() {
  const [requirement, setRequirement] = useState<ActiveMaterialRequirement | null>(null);
  // Снимок значения на момент самого первого чтения из IndexedDB — стабильный,
  // не меняется при последующих save()/clear(). Нужен потребителям, чтобы
  // отличить "было ли что-то ДО этого захода" от того, что они сами только
  // что записали (см. CheckRequirementScreen). Через отдельный useState, а не
  // ref — react-hooks/refs запрещает чтение ref.current во время рендера.
  const [initialRequirement, setInitialRequirement] = useState<ActiveMaterialRequirement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    get<ActiveMaterialRequirement>(ACTIVE_REQUIREMENT_STORAGE_KEY).then((value) => {
      if (!cancelled) {
        setRequirement(value ?? null);
        setInitialRequirement(value ?? null);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (next: ActiveMaterialRequirement) => {
    await set(ACTIVE_REQUIREMENT_STORAGE_KEY, next);
    setRequirement(next);
  }, []);

  const clear = useCallback(async () => {
    await del(ACTIVE_REQUIREMENT_STORAGE_KEY);
    setRequirement(null);
  }, []);

  return { requirement, initialRequirement, loaded, save, clear };
}
