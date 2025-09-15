import { Comment } from "@modules/comments/comment.model";
import { Follower } from "@modules/followers/follower.model";
import { Like } from "@modules/likes/like.model";
import { Post } from "@modules/posts/post.model";
import { User } from "@modules/users/user.model";

type U = Partial<{
  email: string;
  password: string;
  role: "user" | "admin";
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}>;
export async function createUser(over: U = {}) {
  const username =
    over.username ?? `u_${Math.random().toString(36).slice(2, 8)}`;
  return User.create({
    email: over.email ?? `${username}@test.com`,
    password: over.password ?? "secret",
    role: over.role ?? "user",
    username,
    usernameLower: username.toLowerCase(),
    displayName: over.displayName,
    avatarUrl: over.avatarUrl,
    bio: over.bio,
  });
}

type P = Partial<{
  author: any;
  title: string;
  content: string;
  createdAt: Date;
  images: any[];
}>;
export async function createPost(over: P = {}) {
  const author = over.author ?? (await createUser())._id;
  return Post.create({
    author,
    title: over.title ?? "Título",
    content: over.content ?? "Contenido",
    createdAt: over.createdAt,
    images: over.images ?? ["https://cdn.test/img.jpg"],
  } as any);
}

type C = Partial<{ post: any; author: any; content: string; createdAt: Date }>;
export async function createComment(over: C = {}) {
  const post = over.post ?? (await createPost())._id;
  const author = over.author ?? (await createUser())._id;
  return Comment.create({
    post,
    author,
    content: over.content ?? "Comentario",
    createdAt: over.createdAt,
  } as any);
}

type L = Partial<{ user: any; targetId: any; targetType: "post" | "comment" }>;
export async function like(over: L) {
  if (!over?.targetId) throw new Error("like(): targetId requerido");
  const user = over.user ?? (await createUser())._id;
  return Like.create({
    user,
    targetId: over.targetId,
    targetType: over.targetType ?? "comment",
  });
}

export async function follow(followerId: any, followeeId: any) {
  return Follower.create({ follower: followerId, followee: followeeId });
}

/** Semilla típica para tests de comments: 2 users, 1 post, 2 comments, 3 likes */
export async function seedBasicComments() {
  const u1 = await createUser({ username: "alice" });
  const u2 = await createUser({ username: "bob" });
  const post = await createPost({ author: u1._id, title: "Hola" });
  const c1 = await createComment({
    post: post._id,
    author: u2._id,
    content: "primero",
    createdAt: new Date(Date.now() - 1000),
  });
  const c2 = await createComment({
    post: post._id,
    author: u1._id,
    content: "segundo",
    createdAt: new Date(Date.now() - 100),
  });
  await like({ user: u1._id, targetId: c1._id, targetType: "comment" });
  await like({ user: u2._id, targetId: c1._id, targetType: "comment" });
  await like({ user: u1._id, targetId: c2._id, targetType: "comment" });
  return { u1, u2, post, c1, c2 };
}
