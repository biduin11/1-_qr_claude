import { z } from "zod";

export const coilInputSchema = z.object({
  colorId: z.string().trim().min(1, "Цвет обязателен"),
  thicknessId: z.string().trim().min(1, "Толщина обязательна"),
  manufacturerId: z.string().trim().min(1, "Производитель обязателен"),
  coatingId: z.string().trim().min(1, "Покрытие обязательно"),
});
