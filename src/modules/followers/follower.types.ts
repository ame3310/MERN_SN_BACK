import type { HydratedDocument, Model, Types } from "mongoose";

export interface FollowerProps {
  follower: Types.ObjectId; 
  followee: Types.ObjectId;   createdAt?: Date;
  updatedAt?: Date;
}
export type FollowerDocument = HydratedDocument<FollowerProps>;
export interface IFollowerModel extends Model<FollowerProps> {}

export type PublicFollow = {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: string;
};

export function toPublicFollow(doc: FollowerDocument): PublicFollow {
  return {
    id: doc._id.toString(),
    followerId: doc.follower.toString(),
    followeeId: doc.followee.toString(),
    createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}
