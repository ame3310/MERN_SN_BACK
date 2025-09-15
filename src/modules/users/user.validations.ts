import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3, "username mínimo 3 caracteres")
  .max(20, "username máximo 20 caracteres")
  .regex(/^[a-zA-Z0-9_]+$/, "username solo puede contener letras, números y _");

export type Username = z.infer<typeof usernameSchema>;

export const updateMeSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().trim().max(60).optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(280).optional(),
});

export type UpdateMeDto = z.infer<typeof updateMeSchema>;
