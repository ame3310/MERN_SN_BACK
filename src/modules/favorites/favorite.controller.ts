import * as favoriteService from "@modules/favorites/favorite.service";
import { toPublicFavorite } from "@modules/favorites/favorite.types";
import {
  favoriteQuerySchema,
  favoriteSchema,
} from "@modules/favorites/favorite.validations";
import { ApiError } from "@shared/errors/apiError";
import { NextFunction, Request, Response } from "express";

export async function addFavorite(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    const { targetId, targetType } = favoriteSchema.parse(req.body);
    const fav = await favoriteService.addFavorite(userId, targetId, targetType);
    res.status(201).json(toPublicFavorite(fav));
  } catch (err) {
    next(err);
  }
}

export async function removeFavorite(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    const { targetId, targetType } = favoriteSchema.parse(req.body);
    await favoriteService.removeFavorite(userId, targetId, targetType);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getFavoriteCount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { targetId, targetType } = favoriteQuerySchema.parse(req.query);
    const count = await favoriteService.getFavoriteCount(targetId, targetType);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

export async function isFavoritedByUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    const { targetId, targetType } = favoriteQuerySchema.parse(req.query);
    const favorited = await favoriteService.isFavoritedByUser(
      userId,
      targetId,
      targetType
    );
    res.json({ favorited });
  } catch (err) {
    next(err);
  }
}
