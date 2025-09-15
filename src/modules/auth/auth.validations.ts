import { usernameSchema } from "@modules/users/user.validations";
import { z } from "zod";

export const emailSchema = z.string().trim().email("Email inválido").max(254);
export const passwordSchema = z.string().min(8, "Mínimo 8 caracteres").max(128);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshInput = z.infer<typeof refreshSchema>;
