import {
  Favorite,
  Favorite as FavoriteModel,
} from "@modules/favorites/favorite.model";
import { Like } from "@modules/likes/like.model";
import { Post } from "@modules/posts/post.model";
import type { PostDocument, PublicPost } from "@modules/posts/post.types";
import { toPublicPost } from "@modules/posts/post.types";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { isValidObjectId } from "mongoose";

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

async function mapPostWithMeta(
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
      FavoriteModel.countDocuments({ targetId: doc._id, targetType: "post" }),
      viewerId && isValidObjectId(viewerId)
        ? FavoriteModel.exists({
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

export async function listFavoritePostsOfUser(opts: {
  profileUserId: string;
  viewerUserId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: PublicPostWithMeta[];
  page: number;
  limit: number;
  total: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

  assertObjectId(opts.profileUserId, "ID de usuario");

  const [favorites, total] = await Promise.all([
    Favorite.find({ user: opts.profileUserId, targetType: "post" })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(false),
    Favorite.countDocuments({ user: opts.profileUserId, targetType: "post" }),
  ]);

  const postIds = favorites.map((f) => f.targetId);
  if (postIds.length === 0) return { data: [], page, limit, total };

  const posts = await Post.find({ _id: { $in: postIds } }).lean(false);
  const postById = new Map(posts.map((p) => [p._id.toString(), p]));
  const orderedPosts: PostDocument[] = postIds
    .map((id) => postById.get(id.toString()))
    .filter((x): x is PostDocument => Boolean(x));
  const data = await Promise.all(
    orderedPosts.map((p) => mapPostWithMeta(p, opts.viewerUserId))
  );

  return { data, page, limit, total };
}
