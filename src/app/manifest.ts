import type { MetadataRoute } from "next";

// Next.js App Router: специальный файл, автоматически отдаёт /manifest.webmanifest
// и добавляет <link rel="manifest"> в head — ручной public/manifest.json не нужен.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Контроль металла",
    short_name: "Контроль металла",
    description: "Проверка соответствия рулона металла требованиям производственной накладной",
    start_url: "/",
    display: "standalone",
    background_color: "#161616",
    theme_color: "#121193",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
