import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Контроль металла",
  description: "Проверка соответствия рулона металла требованиям производственной накладной",
  // iOS не читает icons из manifest.webmanifest для "На экран «Домой»" —
  // нужна отдельная ссылка apple-touch-icon (ARCHITECTURE.md §9, необязательная подсказка).
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f3c78",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
