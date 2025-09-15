import { Comment } from "@modules/comments/comment.model";
import type {
  CommentDocument,
  PublicComment,
} from "@modules/comments/comment.types";
import { toPublicComment } from "@modules/comments/comment.types";
import { Post } from "@modules/posts/post.model";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { assertValidObjectId } from "@utils/mongo";

async function assertPostExists(postId: string) {
  assertValidObjectId(postId, "ID de post");
  const exists = await Post.exists({ _id: postId });
  if (!exists) {
    throw ApiError.notFound("Post no encontrado", ERR.POST.NOT_FOUND);
  }
}

export async function createComment(
  userId: string,
  data: { postId: string; content: string }
): Promise<PublicComment> {
  if (!userId) throw ApiError.unauthorized();
  assertValidObjectId(userId, "ID de usuario");
  await assertPostExists(data.postId);

  const created: CommentDocument = await Comment.create({
    post: data.postId,
    author: userId,
    content: data.content,
  });

  return toPublicComment(created);
}

export async function listCommentsByPost(
  postId: string,
  options?: { page?: number; limit?: number }
): Promise<PublicComment[]> {
  await assertPostExists(postId);

  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(100, Math.max(1, options?.limit ?? 20));
  const skip = (page - 1) * limit;

  const docs = await Comment.find({ post: postId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return docs.map(toPublicComment);
}

export async function getCommentById(
  commentId: string
): Promise<PublicComment> {
  assertValidObjectId(commentId, "ID de comentario");
  const doc = await Comment.findById(commentId);
  if (!doc) {
    throw ApiError.notFound("Comentario no encontrado", ERR.COMMENT.NOT_FOUND);
  }
  return toPublicComment(doc);
}

export async function updateComment(
  commentId: string,
  userId: string,
  data: { content: string }
): Promise<PublicComment> {
  assertValidObjectId(commentId, "ID de comentario");
  assertValidObjectId(userId, "ID de usuario");

  const doc = await Comment.findById(commentId);
  if (!doc) {
    throw ApiError.notFound("Comentario no encontrado", ERR.COMMENT.NOT_FOUND);
  }

  const isOwner = doc.author.toString() === userId;
  if (!isOwner) {
    throw ApiError.forbidden(
      "No puedes editar este comentario",
      ERR.COMMENT.NOT_OWNER
    );
  }

  doc.content = data.content;
  await doc.save();

  return toPublicComment(doc);
}

export async function deleteComment(
  commentId: string,
  userId: string,
  isAdmin: boolean
): Promise<void> {
  assertValidObjectId(commentId, "ID de comentario");
  assertValidObjectId(userId, "ID de usuario");

  const doc = await Comment.findById(commentId);
  if (!doc) {
    throw ApiError.notFound("Comentario no encontrado", ERR.COMMENT.NOT_FOUND);
  }

  const isOwner = doc.author.toString() === userId;
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden(
      "No puedes borrar este comentario",
      ERR.COMMENT.NOT_OWNER
    );
  }

  await doc.deleteOne();
}
