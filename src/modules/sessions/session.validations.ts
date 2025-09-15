import { z } from "zod";

export const revokeSessionParamSchema = z.object({
  sessionId: z.string().trim().min(1, "El ID de sesión es obligatorio"),
});
export type RevokeSessionParams = z.infer<typeof revokeSessionParamSchema>;
