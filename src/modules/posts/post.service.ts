import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { isValidObjectId } from "mongoose";
import { Post } from "@modules/posts/post.model";
import type { PostDocument, PublicPost } from "@modules/posts/post.types";
import { toPublicPost } from "@modules/posts/post.types";

type Actor = { id: string; role: "user" | "admin" };

function assertObjectId(id: string, label = "ID") {
  if (!isValidObjectId(id))
    throw ApiError.badRequest(`${label} inválido`, ERR.COMMON.BAD_REQUEST);
}

function ensureOwnershipOrAdmin(actor: Actor, doc: PostDocument) {
  const isOwner = doc.author.toString() === actor.id;
  if (!isOwner && actor.role !== "admin") {
    throw ApiError.forbidden(
      "No puedes modificar este post",
      ERR.COMMON.FORBIDDEN
    );
  }
}

export async function createPost(
  authorId: string,
  data: { title?: string; content?: string; images: string[] }
): Promise<PublicPost> {
  assertObjectId(authorId, "ID de autor");
  const doc = await Post.create({ author: authorId, ...data });
  return toPublicPost(doc);
}

export async function getPostById(postId: string): Promise<PublicPost> {
  assertObjectId(postId, "ID de post");
  const doc = await Post.findById(postId);
  if (!doc) throw ApiError.notFound("Post no encontrado", ERR.POST.NOT_FOUND);
  return toPublicPost(doc);
}

export async function updatePost(
  actor: Actor,
  postId: string,
  patch: { title?: string; content?: string; images?: string[] }
): Promise<PublicPost> {
  assertObjectId(postId, "ID de post");
  const doc = await Post.findById(postId);
  if (!doc) throw ApiError.notFound("Post no encontrado", ERR.POST.NOT_FOUND);

  ensureOwnershipOrAdmin(actor, doc);

  if ("title" in patch) doc.title = patch.title;
  if ("content" in patch) doc.content = patch.content;
  if ("images" in patch) doc.images = patch.images!;
  await doc.save();

  return toPublicPost(doc);
}

export async function deletePost(actor: Actor, postId: string): Promise<void> {
  assertObjectId(postId, "ID de post");
  const doc = await Post.findById(postId);
  if (!doc) throw ApiError.notFound("Post no encontrado", ERR.POST.NOT_FOUND);
  ensureOwnershipOrAdmin(actor, doc);
  await Post.findByIdAndDelete(postId);
}
