import type {
  FollowerProps,
  IFollowerModel,
} from "@modules/followers/follower.types";
import { Schema, model } from "mongoose";

const followerSchema = new Schema<FollowerProps, IFollowerModel>(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    followee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

followerSchema.index({ follower: 1, followee: 1 }, { unique: true });
followerSchema.index({ followee: 1, createdAt: -1 });
followerSchema.index({ follower: 1, createdAt: -1 });

export const Follower = model<FollowerProps, IFollowerModel>(
  "Follower",
  followerSchema
);
