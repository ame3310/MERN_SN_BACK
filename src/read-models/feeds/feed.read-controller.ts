import { ApiError } from "@shared/errors/apiError";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as feed from "./feed.read-service";

const feedQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeSelf: z.coerce.boolean().optional(),
});

const userParam = z.object({ userId: z.string().trim().min(1) });

export async function getMyFeed(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const viewer = req.user;
    if (!viewer) throw ApiError.unauthorized();

    const { page, limit, includeSelf } = feedQuery.parse(req.query);
    const result = await feed.getFeed({
      viewerId: viewer.id,
      page,
      limit,
      includeSelf,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserFeed(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const viewerId = req.user?.id;
    const { userId } = userParam.parse(req.params);
    const { page, limit, includeSelf } = feedQuery.parse(req.query);

    const result = await feed.getUserFeed({
      userId,
      viewerId,
      page,
      limit,
      includeSelf,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
