import type { HydratedDocument, Model, Types } from "mongoose";

export type LikeTargetType = "post" | "comment";

export interface LikeProps {
  user: Types.ObjectId;
  targetId: Types.ObjectId;
  targetType: LikeTargetType;
  createdAt?: Date;
  updatedAt?: Date;
}
export type LikeDocument = HydratedDocument<LikeProps>;
export interface ILikeModel extends Model<LikeProps> {}

export type PublicLike = {
  id: string;
  userId: string;
  targetId: string;
  targetType: LikeTargetType;
  createdAt: string;
};

export function toPublicLike(like: LikeDocument): PublicLike {
  return {
    id: like._id.toString(),
    userId: like.user.toString(),
    targetId: like.targetId.toString(),
    targetType: like.targetType,
    createdAt: like.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}
