import { z } from "zod";

export const favoriteSchema = z.object({
  targetId: z.string().trim().min(1, "ID objetivo requerido"),
  targetType: z.enum(["post"], { message: "Tipo de objetivo inválido" }),
});

export const favoriteQuerySchema = z.object({
  targetId: z.string().trim().min(1),
  targetType: z.enum(["post"]),
});
