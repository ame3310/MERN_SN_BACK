import * as followerService from "@modules/followers/follower.service";
import { toPublicFollow } from "@modules/followers/follower.types";
import { followSchema } from "@modules/followers/follower.validations";
import { ApiError } from "@shared/errors/apiError";
import { NextFunction, Request, Response } from "express";

export async function follow(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) throw ApiError.unauthorized();

    const { followeeId } = followSchema.parse(req.body);
    const doc = await followerService.follow(user.id, followeeId);
    res.status(201).json(toPublicFollow(doc));
  } catch (err) {
    next(err);
  }
}

export async function unfollow(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) throw ApiError.unauthorized();

    const { followeeId } = followSchema.parse(req.body);
    await followerService.unfollow(user.id, followeeId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
