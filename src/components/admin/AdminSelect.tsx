"use client";

import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

/** Нативный <select> с рисованным шевроном поверх (appearance: none скрывает системный). */
export function AdminSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="admin-select-wrap">
      <select className={["admin-select", className].filter(Boolean).join(" ")} {...props} />
      <ChevronDown size={16} className="admin-select-chevron" aria-hidden />
    </div>
  );
}
