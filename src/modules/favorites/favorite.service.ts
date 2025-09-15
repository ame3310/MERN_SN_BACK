import { Favorite } from "@modules/favorites/favorite.model";
import type {
  FavoriteDocument,
  FavoriteTargetType,
} from "@modules/favorites/favorite.types";
import { Post } from "@modules/posts/post.model";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { isValidObjectId } from "mongoose";

type TargetType = FavoriteTargetType;

const TargetModels = {
  post: Post,
} as const;

async function validateTarget(
  targetId: string,
  targetType: TargetType
): Promise<void> {
  if (!isValidObjectId(targetId)) {
    throw ApiError.badRequest(
      "ID de objetivo inválido",
      ERR.COMMON.BAD_REQUEST
    );
  }
  const Model = TargetModels[targetType];
  const exists = await Model.exists({ _id: targetId });
  if (!exists) {
    throw ApiError.notFound(
      targetType === "post" ? "Post no encontrado" : "Comentario no encontrado",
      targetType === "post" ? ERR.POST.NOT_FOUND : ERR.COMMENT.NOT_FOUND
    );
  }
}

export async function addFavorite(
  userId: string,
  targetId: string,
  targetType: TargetType
): Promise<FavoriteDocument> {
  await validateTarget(targetId, targetType);

  const exists = await Favorite.findOne({ user: userId, targetId, targetType });
  if (exists)
    throw ApiError.badRequest("Ya en favoritos", ERR.FAVORITE.ALREADY_EXISTS);

  return Favorite.create({ user: userId, targetId, targetType });
}

export async function removeFavorite(
  userId: string,
  targetId: string,
  targetType: TargetType
): Promise<void> {
  await validateTarget(targetId, targetType);

  const deleted = await Favorite.findOneAndDelete({
    user: userId,
    targetId,
    targetType,
  });
  if (!deleted)
    throw ApiError.notFound("Favorito no encontrado", ERR.FAVORITE.NOT_FOUND);
}

export async function getFavoriteCount(
  targetId: string,
  targetType: TargetType
): Promise<number> {
  if (!isValidObjectId(targetId)) {
    throw ApiError.badRequest(
      "ID de objetivo inválido",
      ERR.COMMON.BAD_REQUEST
    );
  }
  return Favorite.countDocuments({ targetId, targetType });
}

export async function isFavoritedByUser(
  userId: string,
  targetId: string,
  targetType: TargetType
): Promise<boolean> {
  if (!isValidObjectId(userId) || !isValidObjectId(targetId)) return false;
  const exists = await Favorite.exists({ user: userId, targetId, targetType });
  return Boolean(exists);
}
