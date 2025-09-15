import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import type { Request, Response } from "express";
import { z } from "zod";
import { searchPosts, searchUsers } from "@modules/searches/search.service";

const querySchema = z.object({
  q: z.string().min(1, "La búsqueda no puede estar vacía"),
});

export async function searchUsersController(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.badRequest("Consulta inválida", ERR.SEARCH.INVALID_QUERY);
  }

  const results = await searchUsers(parsed.data.q);
  res.status(200).json(results);
}

export async function searchPostsController(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.badRequest("Consulta inválida", ERR.SEARCH.INVALID_QUERY);
  }

  const results = await searchPosts(parsed.data.q);
  res.status(200).json(results);
}
