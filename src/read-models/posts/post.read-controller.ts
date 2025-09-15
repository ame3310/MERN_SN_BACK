import { listPostsQuerySchema } from "@modules/posts/post.validations";
import * as postRead from "@read-models/posts/post.read-service";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().trim().min(1, "ID requerido"),
});

const userIdParamSchema = z.object({
  userId: z.string().trim().min(1, "ID de usuario requerido"),
});

export async function getPostWithMeta(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const viewerId = req.user?.id;
    const { id } = idParamSchema.parse(req.params);
    const dto = await postRead.getPostWithMeta(id, viewerId);
    res.json(dto);
  } catch (err) {
    next(err);
  }
}

export async function listPostsWithMeta(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const viewerId = req.user?.id;
    const { authorId, page, limit } = listPostsQuerySchema.parse(req.query);

    const result = await postRead.listPostsWithMeta({
      userId: viewerId,
      authorId,
      page,
      limit,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listUserPostsWithMeta(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const viewerId = req.user?.id;
    const { userId } = userIdParamSchema.parse(req.params);
    const { page, limit } = listPostsQuerySchema
      .pick({ page: true, limit: true })
      .parse(req.query);

    const result = await postRead.listPostsWithMeta({
      userId: viewerId,
      authorId: userId,
      page,
      limit,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
