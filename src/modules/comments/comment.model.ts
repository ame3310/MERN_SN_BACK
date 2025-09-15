import type {
  CommentProps,
  ICommentModel,
} from "@modules/comments/comment.types";
import { model, Schema } from "mongoose";

const commentSchema = new Schema<CommentProps, ICommentModel>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: -1 });

export const Comment = model<CommentProps, ICommentModel>(
  "Comment",
  commentSchema
);
