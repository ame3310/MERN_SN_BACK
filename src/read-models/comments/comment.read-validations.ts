import { z } from "zod";

export const listByPostQuerySchema = z.object({
  postId: z.preprocess(
    (v) => (Array.isArray(v) ? v[0] : v),
    z.string().trim().min(1, "El ID del post es obligatorio")
  ),
  page: z.preprocess(
    (v) => (Array.isArray(v) ? v[0] : v),
    z.coerce.number().int().positive().optional()
  ),
  limit: z.preprocess(
    (v) => (Array.isArray(v) ? v[0] : v),
    z.coerce.number().int().positive().max(100).optional()
  ),
});
export type ListByPostQuery = z.infer<typeof listByPostQuerySchema>;
