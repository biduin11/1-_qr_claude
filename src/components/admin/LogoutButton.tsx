"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
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
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      style={{
        marginTop: "auto",
        padding: "0.55rem 0.75rem",
        borderRadius: "var(--radius-md)",
        color: "var(--brand-orange)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: "0.9rem",
        textAlign: "left",
        transition: "background-color 0.15s ease",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--brand-orange-soft)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
      }
    >
      {pending ? "Выход…" : "Выйти"}
    </button>
  );
}
