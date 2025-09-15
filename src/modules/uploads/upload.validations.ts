import { z } from "zod";

export const kindSchema = z.enum(["post", "avatar"]);
export const signQuerySchema = z.object({ kind: kindSchema.default("post") });
export const signBatchBodySchema = z.object({
  kind: kindSchema.default("post"),
  count: z.coerce.number().int().min(1).max(10).default(1),
});
