import type { HydratedDocument, Model, Types } from "mongoose";

export interface PostProps {
  author: Types.ObjectId;
  title?: string;
  content?: string;
  images: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type PostDocument = HydratedDocument<PostProps>;
export interface IPostModel extends Model<PostProps> {}

export type PublicPostAuthor = {
  id: string;
  username: string;
  avatarUrl?: string | null;
};

export type PublicPost = {
  id: string;
  authorId: string;
  author?: PublicPostAuthor;
  title?: string;
  content?: string;
  images: string[];
  createdAt: string;
  updatedAt?: string;
};

export type AuthorPopulated = {
  _id: Types.ObjectId;
  username: string;
  avatarUrl?: string | null;
};

export type PostHydrated = HydratedDocument<
  Omit<PostProps, "author"> & { author: Types.ObjectId | AuthorPopulated }
>;

function isAuthorPopulated(
  a: Types.ObjectId | AuthorPopulated
): a is AuthorPopulated {
  return typeof a === "object" && a !== null && "_id" in a && "username" in a;
}

export function toPublicPost(doc: PostHydrated): PublicPost {
  const author = doc.author;

  const authorId = isAuthorPopulated(author)
    ? author._id.toHexString()
    : author.toHexString();

  const base: PublicPost = {
    id: doc._id.toHexString(),
    authorId,
    title: doc.title,
    content: doc.content,
    images: Array.isArray(doc.images) ? doc.images : [],
    createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
  };

  if (isAuthorPopulated(author)) {
    base.author = {
      id: author._id.toHexString(),
      username: author.username,
      avatarUrl: author.avatarUrl ?? null,
    };
  }

  return base;
}
