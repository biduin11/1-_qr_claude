import { createReferenceDataHandlers } from "@/lib/admin/reference-crud";
import { prisma } from "@/lib/prisma";
import { colorInputSchema } from "@/lib/validation/reference-data";

export const colorHandlers = createReferenceDataHandlers(
  prisma.color,
  colorInputSchema,
  "Цвет с таким кодом RAL уже существует",
);
