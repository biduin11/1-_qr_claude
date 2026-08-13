import { createReferenceDataHandlers } from "@/lib/admin/reference-crud";
import { prisma } from "@/lib/prisma";
import { thicknessInputSchema } from "@/lib/validation/reference-data";

export const thicknessHandlers = createReferenceDataHandlers(
  prisma.thickness,
  thicknessInputSchema,
  "Толщина с таким значением уже существует",
);
