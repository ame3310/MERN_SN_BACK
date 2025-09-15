import type { HydratedDocument, Model } from "mongoose";

export type UserProps = {
  email: string;
  password: string;
  role: "user" | "admin";
  username: string;
  usernameLower: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  bio?: string;
  displayName?: string;
  refreshTokenHash?: string | null;
};

export interface IUserMethods {
  comparePassword(plain: string): Promise<boolean>;
}

export interface IUserModel extends Model<UserProps, {}, IUserMethods> {
  findByEmail(email: string): Promise<UserDocument | null>;
  findByUsername(username: string): Promise<UserDocument | null>;
}

export type UserDocument = HydratedDocument<UserProps, IUserMethods>;

export type PublicUser = {
  id: string;
  email: string;
  role: "user" | "admin";
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
};

export type PublicAuthorBrief = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
};

export function toPublicUser(doc: UserDocument): PublicUser {
  return {
    id: doc.id,
    email: doc.email,
    role: doc.role,
    username: doc.username,
    displayName: doc.displayName,
    avatarUrl: doc.avatarUrl,
    bio: doc.bio,
  };
}

export function toAuthorBrief(doc: UserDocument): PublicAuthorBrief {
  return {
    id: doc.id,
    username: doc.username,
    displayName: doc.displayName,
    avatarUrl: doc.avatarUrl,
  };
}

export type PublicUserForSearch = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
};

export function toPublicUserForSearch(doc: UserDocument): PublicUserForSearch {
  return {
    id: doc.id,
    username: doc.username,
    displayName: doc.displayName,
    avatarUrl: doc.avatarUrl,
  };
}
