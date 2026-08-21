"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Блок пользователя в сайдбаре: аватар-инициал + логин + меню с выходом.
 * Заменяет прежний отдельный "Выйти"-пункт внизу сайдбара (LogoutButton) —
 * та же логика fetch/redirect, но теперь как пункт выпадающего меню под
 * аватаром (DealDeck: user-block вверху сайдбара, не внизу списком).
 */
export function UserMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="admin-user-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="admin-user-avatar" aria-hidden>
          {username.slice(0, 1)}
        </span>
        <span className="admin-user-name">{username}</span>
        <ChevronDown size={16} className={`admin-user-chevron${open ? " is-open" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="admin-user-menu" role="menu">
          <button type="button" className="admin-menu-item" role="menuitem" onClick={handleLogout} disabled={pending}>
            <LogOut size={15} aria-hidden />
            {pending ? "Выход…" : "Выйти"}
          </button>
        </div>
      )}
    </div>
  );
}
