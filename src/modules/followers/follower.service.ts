import { Follower } from "@modules/followers/follower.model";
import type { FollowerDocument } from "@modules/followers/follower.types";
import { User } from "@modules/users/user.model";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { isValidObjectId } from "mongoose";

function assertObjectId(id: string, label: string) {
  if (!isValidObjectId(id))
    throw ApiError.badRequest(`${label} inválido`, ERR.COMMON.BAD_REQUEST);
}

export async function follow(
  userId: string,
  followeeId: string
): Promise<FollowerDocument> {
  assertObjectId(userId, "ID de usuario");
  assertObjectId(followeeId, "followeeId");

  if (userId === followeeId) {
    throw ApiError.badRequest(
      "No puedes seguirte a ti mismo",
      ERR.FOLLOW.SELF_FOLLOW
    );
  }

  const existsUser = await User.exists({ _id: followeeId });
  if (!existsUser)
    throw ApiError.notFound(
      "Usuario a seguir no encontrado",
      ERR.USER.NOT_FOUND
    );

  const exists = await Follower.findOne({
    follower: userId,
    followee: followeeId,
  });
  if (exists)
    throw ApiError.badRequest(
      "Ya sigues a este usuario",
      ERR.FOLLOW.ALREADY_FOLLOWING
    );

  return Follower.create({ follower: userId, followee: followeeId });
}

export async function unfollow(
  userId: string,
  followeeId: string
): Promise<void> {
  assertObjectId(userId, "ID de usuario");
  assertObjectId(followeeId, "followeeId");

  const deleted = await Follower.findOneAndDelete({
    follower: userId,
    followee: followeeId,
  });
  if (!deleted)
    throw ApiError.notFound(
      "No seguías a este usuario",
      ERR.FOLLOW.NOT_FOLLOWING
    );
}
