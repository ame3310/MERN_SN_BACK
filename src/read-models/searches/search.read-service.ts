import { Post } from "@modules/posts/post.model";
import type { PublicPost } from "@modules/posts/post.types";
import { toPublicPost } from "@modules/posts/post.types";

import { User } from "@modules/users/user.model";
import {
  toPublicUserForSearch,
  type PublicUserForSearch,
} from "@modules/users/user.types";

type SearchType = "all" | "users" | "posts";

export async function searchUsers(opts: {
  q: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: PublicUserForSearch[];
  page: number;
  limit: number;
  total: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

  const rxUsername = new RegExp(`^${opts.q.trim()}`, "i");
  const filter = { username: rxUsername };

  const [docs, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { data: docs.map(toPublicUserForSearch), page, limit, total };
}

export async function searchPosts(opts: {
  q: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: PublicPost[];
  page: number;
  limit: number;
  total: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const rx = new RegExp(opts.q.trim(), "i");

  const filter = { $or: [{ title: rx }, { content: rx }] };

  const [docs, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("title content createdAt images author")
      .populate("author", "username avatarUrl"),
    Post.countDocuments(filter),
  ]);

  return { data: docs.map(toPublicPost), page, limit, total };
}

export async function searchAll(opts: {
  q: string;
  page?: number;
  limit?: number;
  type?: SearchType;
}): Promise<{
  users?: {
    data: PublicUserForSearch[];
    page: number;
    limit: number;
    total: number;
  };
  posts?: { data: PublicPost[]; page: number; limit: number; total: number };
}> {
  const type = opts.type ?? "all";
  if (type === "users") return { users: await searchUsers(opts) };
  if (type === "posts") return { posts: await searchPosts(opts) };

  const [users, posts] = await Promise.all([
    searchUsers(opts),
    searchPosts(opts),
  ]);
  return { users, posts };
}
