import type { HydratedDocument, Model, Types } from "mongoose";

export type FavoriteTargetType = "post";

export interface FavoriteProps {
  user: Types.ObjectId;
  targetId: Types.ObjectId;
  targetType: FavoriteTargetType;
  createdAt?: Date;
  updatedAt?: Date;
}

export type FavoriteDocument = HydratedDocument<FavoriteProps>;
export interface IFavoriteModel extends Model<FavoriteProps> {}

export type PublicFavorite = {
  id: string;
  userId: string;
  targetId: string;
  targetType: FavoriteTargetType;
  createdAt: string;
  updatedAt?: string;
};

export function toPublicFavorite(doc: FavoriteDocument): PublicFavorite {
  return {
    id: doc._id.toString(),
    userId: doc.user.toString(),
    targetId: doc.targetId.toString(),
    targetType: doc.targetType,
    createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
  };
}
