"use client";

import { Printer } from "lucide-react";

import { AdminButton } from "@/components/admin/AdminButton";

/** Кнопка печати паспорта рулона — сама разметка печатается через `@media print` (globals.css). */
export function PrintButton() {
  return (
    <AdminButton type="button" variant="primary" icon={<Printer size={15} />} onClick={() => window.print()}>
      Печать
    </AdminButton>
  );
}
