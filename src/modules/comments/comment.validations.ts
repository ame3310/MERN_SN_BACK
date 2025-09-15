import { z } from "zod";

export const createCommentSchema = z.object({
  postId: z.string().trim().min(1, "El ID del post es obligatorio"),
  content: z
    .string()
    .trim()
    .min(1, "El comentario no puede estar vacío")
    .max(2000),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "El comentario no puede estar vacío")
    .max(2000),
});
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const commentIdParamSchema = z.object({
  commentId: z.string().trim().min(1, "El ID de comentario es obligatorio"),
});
export type CommentIdParam = z.infer<typeof commentIdParamSchema>;
