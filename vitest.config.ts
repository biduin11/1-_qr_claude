import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // По умолчанию (без явного пути в CLI) — только unit-тесты, не требующие
    // БД. Интеграционные тесты — отдельный vitest.integration.config.ts.
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
});
