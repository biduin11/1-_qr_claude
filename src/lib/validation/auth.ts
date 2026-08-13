import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Логин обязателен"),
  password: z.string().min(1, "Пароль обязателен"),
});
