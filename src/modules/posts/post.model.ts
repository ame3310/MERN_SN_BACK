import type { IPostModel, PostProps } from "@modules/posts/post.types";
import { Schema, model } from "mongoose";

const postSchema = new Schema<PostProps, IPostModel>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, trim: true, maxlength: 120 },
    content: { type: String, trim: true, maxlength: 5000 },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: unknown[]) => Array.isArray(arr) && arr.length > 0,
        message: "Debe incluirse al menos una imagen",
      },
    },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

export const Post = model<PostProps, IPostModel>("Post", postSchema);
