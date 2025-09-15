import type {
  FavoriteProps,
  IFavoriteModel,
} from "@modules/favorites/favorite.types";
import { Schema, model } from "mongoose";

const favoriteSchema = new Schema<FavoriteProps, IFavoriteModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    targetType: { type: String, enum: ["post"], required: true, index: true },
  },
  { timestamps: true }
);

favoriteSchema.index({ user: 1, targetId: 1, targetType: 1 }, { unique: true });
favoriteSchema.index({ targetId: 1, targetType: 1 });

export const Favorite = model<FavoriteProps, IFavoriteModel>(
  "Favorite",
  favoriteSchema
);
