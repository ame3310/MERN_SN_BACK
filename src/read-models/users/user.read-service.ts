import { Follower } from "@modules/followers/follower.model";
import { Post } from "@modules/posts/post.model";
import { User } from "@modules/users/user.model";
import type { PublicUser } from "@modules/users/user.types";
import { toPublicUser } from "@modules/users/user.types";
import { usernameSchema } from "@modules/users/user.validations";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { isValidObjectId } from "mongoose";

export type PublicUserProfile = ReturnType<typeof toPublicUser> & {
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
};

export async function getUserPublicProfileByUsername(
  username: string,
  viewerId?: string
): Promise<PublicUserProfile> {
  const value = usernameSchema.parse(username).trim();
  const user = await User.findByUsername(value);
  if (!user)
    throw ApiError.notFound("Usuario no encontrado", ERR.USER.NOT_FOUND);

  const [postCount, followerCount, followingCount, followedExists] =
    await Promise.all([
      Post.countDocuments({ author: user._id }),
      Follower.countDocuments({ followee: user._id }),
      Follower.countDocuments({ follower: user._id }),
      viewerId
        ? Follower.exists({ follower: viewerId, followee: user._id })
        : null,
    ]);

  return {
    ...toPublicUser(user),
    postCount,
    followerCount,
    followingCount,
    isFollowedByMe: !!followedExists,
  };
}

export async function getUserPublicProfileSmart(
  idOrUsername: string,
  viewerId?: string
): Promise<PublicUserProfile> {
  return isValidObjectId(idOrUsername)
    ? getUserPublicProfile(idOrUsername, viewerId)
    : getUserPublicProfileByUsername(idOrUsername, viewerId);
}

function assertObjectId(id: string, label = "ID") {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest(`${label} inválido`, ERR.COMMON.BAD_REQUEST);
  }
}

export async function getUserPublicProfile(
  userId: string,
  viewerId?: string
): Promise<PublicUserProfile> {
  assertObjectId(userId, "ID de usuario");

  const user = await User.findById(userId);
  if (!user)
    throw ApiError.notFound("Usuario no encontrado", ERR.USER.NOT_FOUND);

  const [postCount, followerCount, followingCount, followedExists] =
    await Promise.all([
      Post.countDocuments({ author: userId }),
      Follower.countDocuments({ followee: userId }),
      Follower.countDocuments({ follower: userId }),
      viewerId && isValidObjectId(viewerId)
        ? Follower.exists({ follower: viewerId, followee: userId })
        : Promise.resolve(null),
    ]);

  return {
    ...toPublicUser(user),
    postCount,
    followerCount,
    followingCount,
    isFollowedByMe: Boolean(followedExists),
  };
}

export async function listUsers(opts: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: PublicUser[];
  page: number;
  limit: number;
  total: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

  const filter: Record<string, unknown> = {};
  if (opts.q && opts.q.trim()) {
    const rx = new RegExp(opts.q.trim(), "i");
    filter["$or"] = [
      { email: rx },
      { username: rx },
      { displayName: rx },
    ].filter((cond) =>
      Object.keys(cond).some((k) =>
        ["email", "username", "displayName"].includes(k)
      )
    );
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    data: users.map((u) => toPublicUser(u)),
    page,
    limit,
    total,
  };
}

export async function isUsernameAvailable(
  username: string
): Promise<{ available: boolean }> {
  const value = usernameSchema.parse(username).trim();
  const taken = await User.findByUsername(value);
  return { available: !taken };
}
