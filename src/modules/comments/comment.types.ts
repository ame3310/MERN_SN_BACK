import type { HydratedDocument, Model, Types } from "mongoose";

export interface CommentProps {
  post: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}
export type CommentDocument = HydratedDocument<CommentProps>;

export interface ICommentModel extends Model<CommentProps> {}

export type PublicComment = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
};

export function toPublicComment(doc: CommentDocument): PublicComment {
  return {
    id: doc._id.toString(),
    postId: doc.post.toString(),
    authorId: doc.author.toString(),
    content: doc.content,
    createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
  };
}
