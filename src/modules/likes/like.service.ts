import { Comment } from "@modules/comments/comment.model";
import { Like } from "@modules/likes/like.model";
import type {
  LikeDocument,
  LikeTargetType,
  PublicLike,
} from "@modules/likes/like.types";
import { toPublicLike } from "@modules/likes/like.types";
import { Post } from "@modules/posts/post.model";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { isValidObjectId } from "mongoose";

type TargetType = LikeTargetType;

const TargetModels = {
  post: Post,
  comment: Comment,
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
  if (!Model) {
    throw ApiError.badRequest(
      "Tipo de objetivo inválido",
      (ERR.LIKE as any)?.INVALID_TARGET_TYPE ?? ERR.COMMON.BAD_REQUEST
    );
  }

  const exists = await Model.exists({ _id: targetId });
  if (!exists) {
    throw ApiError.notFound(
      targetType === "post" ? "Post no encontrado" : "Comentario no encontrado",
      targetType === "post" ? ERR.POST.NOT_FOUND : ERR.COMMENT.NOT_FOUND
    );
  }
}

export async function likeTarget(
  userId: string,
  targetId: string,
  targetType: TargetType
): Promise<PublicLike> {
  await validateTarget(targetId, targetType);

  const exists = await Like.findOne({ user: userId, targetId, targetType });
  if (exists) {
    throw ApiError.badRequest("Ya diste like", ERR.LIKE.ALREADY_EXISTS);
  }

  const created: LikeDocument = await Like.create({
    user: userId,
    targetId,
    targetType,
  });
  return toPublicLike(created);
}

export async function unlikeTarget(
  userId: string,
  targetId: string,
  targetType: TargetType
): Promise<void> {
  await validateTarget(targetId, targetType);

  const deleted = await Like.findOneAndDelete({
    user: userId,
    targetId,
    targetType,
  });
  if (!deleted) {
    throw ApiError.notFound("Like no encontrado", ERR.LIKE.NOT_FOUND);
  }
}

export async function getLikeCount(
  targetId: string,
  targetType: TargetType
): Promise<number> {
  if (!isValidObjectId(targetId)) {
    throw ApiError.badRequest(
      "ID de objetivo inválido",
      ERR.COMMON.BAD_REQUEST
    );
  }
  return Like.countDocuments({ targetId, targetType });
}

export async function isLikedByUser(
  userId: string,
  targetId: string,
  targetType: TargetType
): Promise<boolean> {
  if (!isValidObjectId(userId) || !isValidObjectId(targetId)) {
    return false;
  }
  const exists = await Like.exists({ user: userId, targetId, targetType });
  return Boolean(exists);
}
