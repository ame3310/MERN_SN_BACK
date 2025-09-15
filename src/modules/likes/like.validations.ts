import { z } from "zod";

export const likeBodySchema = z.object({
  targetId: z.string().trim().min(1, { message: "El ID del objetivo es obligatorio" }),
  targetType: z.enum(["post", "comment"], { message: "Tipo de objetivo inválido" }),
});
export type LikeBodyInput = z.infer<typeof likeBodySchema>;
export const likeQuerySchema = z.object({
  targetId: z.preprocess(
    (v) => (Array.isArray(v) ? v[0] : v),
    z.string().trim().min(1, { message: "El ID del objetivo es obligatorio" })
  ),
  targetType: z.preprocess(
    (v) => (Array.isArray(v) ? v[0] : v),
    z.enum(["post", "comment"], { message: "Tipo de objetivo inválido" })
  ),
});
export type LikeQueryInput = z.infer<typeof likeQuerySchema>;

export const parseLikeBody = (data: unknown) => likeBodySchema.parse(data);
export const parseLikeQuery = (data: unknown) => likeQuerySchema.parse(data);
