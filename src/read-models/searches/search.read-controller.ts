import * as search from "@read-models/searches/search.read-service";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

const searchQuery = z.object({
  q: z.string().trim().min(1, "Query requerida"),
  type: z.enum(["all", "users", "posts"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function searchHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { q, type, page, limit } = searchQuery.parse(req.query);
    const result = await search.searchAll({ q, type, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
