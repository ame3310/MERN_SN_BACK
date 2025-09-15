import * as likeService from "@modules/likes/like.service";
import {
  likeBodySchema,
  likeQuerySchema,
} from "@modules/likes/like.validations";
import { ApiError } from "@shared/errors/apiError";
import { NextFunction, Request, Response } from "express";

export async function likeTarget(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    const { targetId, targetType } = likeBodySchema.parse(req.body);
    const likeTargetDTO = await likeService.likeTarget(
      userId,
      targetId,
      targetType
    );
    res.status(201).json(likeTargetDTO);
  } catch (err) {
    next(err);
  }
}

export async function unlikeTarget(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    const { targetId, targetType } = likeBodySchema.parse(req.body);
    await likeService.unlikeTarget(userId, targetId, targetType);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getLikeCount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { targetId, targetType } = likeQuerySchema.parse(req.query);
    const count = await likeService.getLikeCount(targetId, targetType);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

export async function isLikedByUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    const { targetId, targetType } = likeQuerySchema.parse(req.query);
    const liked = await likeService.isLikedByUser(userId, targetId, targetType);
    res.json({ liked });
  } catch (err) {
    next(err);
  }
}
