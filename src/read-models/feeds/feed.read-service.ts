import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { isValidObjectId } from "mongoose";

import { Post } from "@modules/posts/post.model";
import type { PostDocument, PublicPost } from "@modules/posts/post.types";
import { toPublicPost } from "@modules/posts/post.types";

import { Favorite } from "@modules/favorites/favorite.model";
import { Follower } from "@modules/followers/follower.model";
import { Like } from "@modules/likes/like.model";

export type PublicPostWithMeta = PublicPost & {
  likeCount: number;
  likedByMe: boolean;
  favoriteCount: number;
  favoritedByMe: boolean;
};

function assertObjectId(id: string, label = "ID") {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest(`${label} inválido`, ERR.COMMON.BAD_REQUEST);
  }
}

async function toPublicPostWithMeta(
  doc: PostDocument,
  viewerId?: string
): Promise<PublicPostWithMeta> {
  const base = toPublicPost(doc);

  const [likeCount, likedExists, favoriteCount, favoritedExists] =
    await Promise.all([
      Like.countDocuments({ targetId: doc._id, targetType: "post" }),
      viewerId && isValidObjectId(viewerId)
        ? Like.exists({ user: viewerId, targetId: doc._id, targetType: "post" })
        : Promise.resolve(null),
      Favorite.countDocuments({ targetId: doc._id, targetType: "post" }),
      viewerId && isValidObjectId(viewerId)
        ? Favorite.exists({
            user: viewerId,
            targetId: doc._id,
            targetType: "post",
          })
        : Promise.resolve(null),
    ]);

  return {
    ...base,
    likeCount,
    likedByMe: Boolean(likedExists),
    favoriteCount,
    favoritedByMe: Boolean(favoritedExists),
  };
}

export async function getFeed(opts: {
  viewerId: string;
  page?: number;
  limit?: number;
  includeSelf?: boolean;
}): Promise<{
  data: PublicPostWithMeta[];
  page: number;
  limit: number;
  total: number;
}> {
  const { viewerId } = opts;
  assertObjectId(viewerId, "viewerId");

  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

  const relations = await Follower.find({ follower: viewerId })
    .select("followee")
    .lean();
  const followeeIds = relations.map((r) => r.followee.toString());
  if (opts.includeSelf) followeeIds.push(viewerId);

  if (followeeIds.length === 0) return { data: [], page, limit, total: 0 };

  const filter = { author: { $in: followeeIds } };

  const [docs, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Post.countDocuments(filter),
  ]);

  const data = await Promise.all(
    docs.map((d) => toPublicPostWithMeta(d, viewerId))
  );
  return { data, page, limit, total };
}

export async function getUserFeed(opts: {
  userId: string;
  viewerId?: string;
  page?: number;
  limit?: number;
  includeSelf?: boolean;
}): Promise<{
  data: PublicPostWithMeta[];
  page: number;
  limit: number;
  total: number;
}> {
  const { userId } = opts;
  assertObjectId(userId, "userId");

  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

  const relations = await Follower.find({ follower: userId })
    .select("followee")
    .lean();
  const followeeIds = relations.map((r) => r.followee.toString());
  if (opts.includeSelf) followeeIds.push(userId);

  if (followeeIds.length === 0) return { data: [], page, limit, total: 0 };

  const filter = { author: { $in: followeeIds } };

  const [docs, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Post.countDocuments(filter),
  ]);

  const data = await Promise.all(
    docs.map((d) => toPublicPostWithMeta(d, opts.viewerId))
  );
  return { data, page, limit, total };
}
