"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ConflictScreen } from "@/components/worker/ConflictScreen";
import { FullScreenMessage } from "@/components/worker/FullScreenMessage";
import { RequirementCard } from "@/components/worker/RequirementCard";
import { useActiveRequirement } from "@/hooks/useActiveRequirement";
import type { ActiveMaterialRequirement } from "@/lib/worker/active-requirement";

export type IncomingRequirement = Omit<ActiveMaterialRequirement, "createdAt" | "expiresAt">;

function buildRequirement(incoming: IncomingRequirement): ActiveMaterialRequirement {
  return { ...incoming, createdAt: new Date().toISOString(), expiresAt: null };
}

export function CheckRequirementScreen({ incoming }: { incoming: IncomingRequirement }) {
  const { requirement, initialRequirement, loaded, save } = useActiveRequirement();
  const [decision, setDecision] = useState<"new" | "keep" | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (initialRequirement === null) {
      // Незавершённого требования не было — сохраняем новое сразу, без вопросов.
      void save(buildRequirement(incoming));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  if (!loaded) {
    return <FullScreenMessage title="Загрузка…" />;
  }

  const hasConflict = initialRequirement !== null && decision === null;

  if (hasConflict && initialRequirement) {
    return (
      <ConflictScreen
        existing={initialRequirement}
        onStartNew={async () => {
          await save(buildRequirement(incoming));
          setDecision("new");
        }}
        onKeepExisting={() => setDecision("keep")}
      />
    );
  }

  const displayed = decision === "keep" ? initialRequirement : requirement;

  if (!displayed) {
    return <FullScreenMessage title="Загрузка…" />;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "1.5rem",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", margin: 0 }}>ТРЕБУЕТСЯ РУЛОН</h1>
      <RequirementCard requirement={displayed} />
      <Link
        href="/scan/coil"
        style={{
          fontSize: "1.5rem",
          padding: "1.25rem 2rem",
          width: "100%",
          maxWidth: 480,
          textAlign: "center",
          textDecoration: "none",
          border: "1px solid #333",
          borderRadius: 8,
          color: "inherit",
        }}
      >
        СКАНИРОВАТЬ РУЛОН
      </Link>
    </main>
  );
}
