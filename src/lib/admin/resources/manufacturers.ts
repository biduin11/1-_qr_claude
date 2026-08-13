import { createReferenceDataHandlers } from "@/lib/admin/reference-crud";
import { prisma } from "@/lib/prisma";
import { manufacturerInputSchema } from "@/lib/validation/reference-data";

export const manufacturerHandlers = createReferenceDataHandlers(
  prisma.manufacturer,
  manufacturerInputSchema,
  "Производитель с таким кодом уже существует",
);
