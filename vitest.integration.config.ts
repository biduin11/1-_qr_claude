import path from "node:path";

import { defineConfig } from "vitest/config";

// Интеграционные тесты бьют по одной и той же реальной БД (не мокается,
// см. заголовки tests/integration/*.test.ts) — файлы должны идти строго
// последовательно, иначе beforeEach одного файла (deleteMany) сносит данные
// теста, который в этот момент выполняется в другом файле параллельно.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
  },
});
