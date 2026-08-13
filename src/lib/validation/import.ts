import { z } from "zod";

import { MAX_IMPORT_ROWS } from "@/lib/excel/parse";

const importRowRefsSchema = z.object({
  colorId: z.string().trim().min(1),
  thicknessId: z.string().trim().min(1),
  manufacturerId: z.string().trim().min(1),
  coatingId: z.string().trim().min(1),
});

export const importConfirmSchema = z.object({
  idempotencyKey: z.string().trim().min(1, "idempotencyKey обязателен"),
  rows: z.array(importRowRefsSchema).max(MAX_IMPORT_ROWS),
});
