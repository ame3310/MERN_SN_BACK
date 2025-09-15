import { z } from "zod";

export const followSchema = z.object({
  followeeId: z.string().trim().min(1, "followeeId requerido"),
});

export const unfollowSchema = followSchema;

export const listByUserQuery = z.object({
  userId: z.string().trim().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
