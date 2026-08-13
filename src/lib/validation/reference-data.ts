import { z } from "zod";

export const colorInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Код обязателен")
    .regex(/^\d+$/, "Код RAL должен состоять только из цифр"),
  displayName: z.string().trim().min(1, "Название обязательно"),
});

export const thicknessInputSchema = z.object({
  valueHundredths: z
    .number()
    .int("Толщина должна быть целым числом сотых миллиметра")
    .positive("Толщина должна быть положительной"),
  displayName: z.string().trim().min(1, "Название обязательно"),
});

const aliasesField = z
  .array(z.string().trim().min(1))
  .default([])
  .transform((aliases) => Array.from(new Set(aliases.map((alias) => alias.toLowerCase()))));

export const manufacturerInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Код обязателен")
    .transform((code) => code.toUpperCase()),
  displayName: z.string().trim().min(1, "Название обязательно"),
  aliases: aliasesField,
});

export const coatingInputSchema = manufacturerInputSchema;
