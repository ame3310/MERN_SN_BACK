import { z } from "zod";

const imageUrl = z
  .string()
  .trim()
  .refine(
    (value) => {
      try {
        const u = new URL(value);
        return u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL de imagen inválida" }
  );

export const createPostSchema = z.object({
  title: z.string().trim().max(120).optional(),
  content: z.string().trim().max(5000).optional(),
  images: z
    .array(imageUrl)
    .min(1, { message: "Debe incluirse al menos una imagen" }),
});

export const updatePostSchema = z
  .object({
    title: z.string().trim().max(120).optional(),
    content: z.string().trim().max(5000).optional(),
    images: z
      .array(imageUrl)
      .min(1, { message: "Debe incluirse al menos una imagen" })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export const listPostsQuerySchema = z.object({
  authorId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
