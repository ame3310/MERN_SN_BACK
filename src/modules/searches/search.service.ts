import { Post } from "@modules/posts/post.model";
import type { PublicPost } from "@modules/posts/post.types";
import { toPublicPost } from "@modules/posts/post.types";

import { User } from "@modules/users/user.model";
import type { PublicUser } from "@modules/users/user.types";
import { toPublicUser } from "@modules/users/user.types";

import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";

export async function searchUsers(query: string): Promise<PublicUser[]> {
  const users = await User.find({
    email: { $regex: query, $options: "i" },
  });

  if (!users.length) {
    throw ApiError.notFound(
      "No se encontraron usuarios",
      ERR.SEARCH.NO_RESULTS
    );
  }
  return users.map(toPublicUser);
}

export async function searchPosts(query: string): Promise<PublicPost[]> {
  const posts = await Post.find({
    $or: [
      { title: { $regex: query, $options: "i" } },
      { content: { $regex: query, $options: "i" } },
    ],
  }).populate("author");

  if (!posts.length) {
    throw ApiError.notFound("No se encontraron posts", ERR.SEARCH.NO_RESULTS);
  }
  return posts.map(toPublicPost);
}
