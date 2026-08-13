"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CoilReadOnlyCard } from "@/components/worker/CoilReadOnlyCard";
import { FullScreenMessage } from "@/components/worker/FullScreenMessage";
import { MatchScreen } from "@/components/worker/MatchScreen";
import { MismatchScreen } from "@/components/worker/MismatchScreen";
import { useActiveRequirement } from "@/hooks/useActiveRequirement";
import type { PublicCoil } from "@/lib/public/coil";
import { compareRequirementToCoil, isFullMatch } from "@/lib/worker/compare";

type LiveState =
  | { status: "idle" }
  | { status: "not-found" }
  | { status: "inactive" }
  | { status: "network-error" }
  | { status: "ok"; coil: PublicCoil };

/**
 * Раздел 8 ТЗ: «Активное требование есть → автоматически выполнить
 * сравнение». Вердикт всегда считается client-side по свежим данным
 * (`cache: "no-store"`) — никогда по SSR-данным страницы, даже если они
 * секунду назад были верны (ARCHITECTURE.md §2/§9, раздел 32: без исключений
 * по кэшу для решения МОЖНО/СТОП).
 */
export function CoilVerdict({
  id,
  initialCoil,
}: {
  id: string;
  initialCoil: Pick<PublicCoil, "ral" | "thickness" | "manufacturer" | "coating">;
}) {
  const router = useRouter();
  const { requirement, loaded, clear } = useActiveRequirement();
  const [live, setLive] = useState<LiveState>({ status: "idle" });
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!loaded || !requirement) return;
    let cancelled = false;

    fetch(`/api/coil/${id}`, { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404) {
          setLive({ status: "not-found" });
          return;
        }
        const data = (await response.json()) as PublicCoil;
        if (!data.active) {
          setLive({ status: "inactive" });
          return;
        }
        setLive({ status: "ok", coil: data });
      })
      .catch(() => {
        if (!cancelled) setLive({ status: "network-error" });
      });

    return () => {
      cancelled = true;
    };
  }, [loaded, requirement, id]);

  if (!loaded) {
    return <FullScreenMessage title="Загрузка…" />;
  }

  if (!requirement) {
    return <CoilReadOnlyCard coil={initialCoil} />;
  }

  if (live.status === "idle") {
    return <FullScreenMessage title="Проверка…" />;
  }

  if (live.status === "not-found") {
    return <FullScreenMessage icon="✕" title="РУЛОН НЕ НАЙДЕН" />;
  }

  if (live.status === "inactive") {
    return <FullScreenMessage icon="✕" title="РУЛОН НЕДОСТУПЕН" />;
  }

  if (live.status === "network-error") {
    return <FullScreenMessage icon="✕" title="НЕТ СВЯЗИ — НЕ УДАЛОСЬ ПРОВЕРИТЬ РУЛОН — СТОП" />;
  }

  const comparisons = compareRequirementToCoil(requirement, live.coil);

  if (isFullMatch(comparisons)) {
    return (
      <MatchScreen
        comparisons={comparisons}
        finishing={finishing}
        onFinish={async () => {
          setFinishing(true);
          await clear();
          router.push("/");
        }}
      />
    );
  }

  // Раздел 6/18 ТЗ: после MISMATCH требование НЕ очищается.
  return <MismatchScreen comparisons={comparisons} onScanAnother={() => router.push("/scan/coil")} />;
}
