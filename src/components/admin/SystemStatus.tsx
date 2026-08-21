"use client";

import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { useEffect, useState } from "react";

type Status = "checking" | "ok" | "down";

const COPY: Record<Status, { title: string; sub: string; icon: typeof ShieldCheck }> = {
  checking: { title: "Проверка…", sub: "проверяем сервисы", icon: ShieldQuestion },
  ok: { title: "Система в порядке", sub: "все сервисы работают", icon: ShieldCheck },
  down: { title: "Проблема с БД", sub: "нет соединения", icon: ShieldAlert },
};

/**
 * Индикатор статуса в подвале сайдбара — реальный опрос /api/health/ready
 * (проверяет соединение с БД, см. route.ts), а не статичная декоративная
 * плашка: премиальный вид без выдуманного "всё ок".
 */
export function SystemStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch("/api/health/ready", { cache: "no-store" });
        if (!cancelled) setStatus(response.ok ? "ok" : "down");
      } catch {
        if (!cancelled) setStatus("down");
      }
    }

    check();
    const interval = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const { title, sub, icon: Icon } = COPY[status];

  return (
    <div className="admin-status-card">
      <span className={`admin-status-icon is-${status}`}>
        <Icon size={17} aria-hidden />
      </span>
      <span style={{ minWidth: 0 }}>
        <p className="admin-status-title">{title}</p>
        <p className="admin-status-sub">
          <span className={`admin-status-dot is-${status}`} aria-hidden />
          {sub}
        </p>
      </span>
    </div>
  );
}
