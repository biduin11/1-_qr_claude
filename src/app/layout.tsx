import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import type { ReactNode } from "react";

import "./globals.css";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { themeInitScript } from "@/components/theme/theme-script";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f1fa" },
    { media: "(prefers-color-scheme: dark)", color: "#16161d" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        {/* beforeInteractive — Next.js гарантированно инлайнит и выполняет
            этот скрипт в <head> до гидратации, иначе вспышка не той темы
            при загрузке. Обычный <head><script> в App Router не работает —
            Next не сливает вручную отрендеренный <head> в документ. */}
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
