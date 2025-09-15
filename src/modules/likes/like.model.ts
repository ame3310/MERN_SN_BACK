import type { ILikeModel, LikeProps } from "@modules/likes/like.types";
import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema<LikeProps, ILikeModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    targetType: {
      type: String,
      enum: ["post", "comment"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

likeSchema.index({ user: 1, targetId: 1, targetType: 1 }, { unique: true });
likeSchema.index({ targetId: 1, targetType: 1 });
export const Like = mongoose.model<LikeProps, ILikeModel>("Like", likeSchema);
