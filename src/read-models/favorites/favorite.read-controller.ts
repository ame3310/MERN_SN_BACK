import { listPostsQuerySchema } from "@modules/posts/post.validations";
import { listFavoritePostsOfUser } from "@read-models/favorites/favorite.read-service";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

const userIdParam = z.object({ userId: z.string().trim().min(1) });

export async function listUserFavoritePosts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const viewerId = req.user?.id;
    const { userId } = userIdParam.parse(req.params);
    const { page, limit } = listPostsQuerySchema
      .pick({ page: true, limit: true })
      .parse(req.query);

    const result = await listFavoritePostsOfUser({
      profileUserId: userId,
      viewerUserId: viewerId,
      page,
      limit,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
