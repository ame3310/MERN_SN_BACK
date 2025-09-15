import { listByPostWithMeta } from "@read-models/comments/comment.read-service";
import { listByPostQuerySchema } from "@read-models/comments/comment.read-validations";
import { NextFunction, Request, Response } from "express";

export async function listCommentsByPostWithMetaController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id ?? null;
    const { postId, page, limit } = listByPostQuerySchema.parse(req.query);

    const {
      data,
      page: p,
      limit: l,
      total,
    } = await listByPostWithMeta(userId, postId, {
      page,
      limit,
    });

    res.json({ data, page: p, limit: l, total });
  } catch (err) {
    next(err);
  }
}
