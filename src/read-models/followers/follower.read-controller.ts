import * as read from "@read-models/followers/follower.read-service";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";

const listParams = z.object({ userId: z.string().trim().min(1) });
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function getFollowers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = listParams.parse(req.params);
    const { page, limit } = listQuery.parse(req.query);
    const result = await read.listFollowers({ userId, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getFollowing(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = listParams.parse(req.params);
    const { page, limit } = listQuery.parse(req.query);
    const result = await read.listFollowing({ userId, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
