import { Favorite } from "@modules/favorites/favorite.model";
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

function pickAuthor(a: unknown): PublicPost["author"] | undefined {
  if (
    a &&
    typeof a === "object" &&
    ("_id" in (a as Record<string, unknown>) || "id" in (a as Record<string, unknown>)) &&
    "username" in (a as Record<string, unknown>)
  ) {
    const anyA = a as { _id?: unknown; id?: unknown; username: string; avatarUrl?: string | null };
    return {
      id: String(anyA._id ?? anyA.id),
      username: anyA.username,
      avatarUrl: anyA.avatarUrl ?? null,
    };
  }
  return undefined;
}

async function toPublicPostWithMeta(
  doc: PostDocument,
  userId?: string
): Promise<PublicPostWithMeta> {
  const base = toPublicPost(doc);

  const [likeCount, likedExists, favoriteCount, favoritedExists] = await Promise.all([
    Like.countDocuments({ targetId: doc._id, targetType: "post" }),
    userId && isValidObjectId(userId)
      ? Like.exists({ user: userId, targetId: doc._id, targetType: "post" })
      : Promise.resolve(null),
    Favorite.countDocuments({ targetId: doc._id, targetType: "post" }),
    userId && isValidObjectId(userId)
      ? Favorite.exists({ user: userId, targetId: doc._id, targetType: "post" })
      : Promise.resolve(null),
  ]);

  const maybeAuthor = pickAuthor((doc as unknown as { author?: unknown }).author);

  return {
    ...base,
    ...(maybeAuthor ? { author: maybeAuthor } : {}),
    likeCount,
    likedByMe: Boolean(likedExists),
    favoriteCount,
    favoritedByMe: Boolean(favoritedExists),
  };
}

export async function getPostWithMeta(postId: string, userId?: string): Promise<PublicPostWithMeta> {
  assertObjectId(postId, "ID de post");
  const doc = await Post.findById(postId).populate({ path: "author", select: "username avatarUrl" });
  if (!doc) throw ApiError.notFound("Post no encontrado", ERR.POST.NOT_FOUND);
  return toPublicPostWithMeta(doc, userId);
}

export async function listPostsWithMeta(opts: {
  userId?: string;
  authorId?: string;
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

  const filter: Record<string, unknown> = {};
  if (opts.authorId) {
    assertObjectId(opts.authorId, "ID de autor");
    filter.author = opts.authorId;
  }

  const [docs, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "author", select: "username avatarUrl" }),
    Post.countDocuments(filter),
  ]);

  const data = await Promise.all(docs.map((d) => toPublicPostWithMeta(d, opts.userId)));
  return { data, page, limit, total };
}
