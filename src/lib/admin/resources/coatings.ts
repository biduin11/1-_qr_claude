import { createReferenceDataHandlers } from "@/lib/admin/reference-crud";
import { prisma } from "@/lib/prisma";
import { coatingInputSchema } from "@/lib/validation/reference-data";

export const coatingHandlers = createReferenceDataHandlers(
  prisma.coating,
  coatingInputSchema,
  "Покрытие с таким кодом уже существует",
);
