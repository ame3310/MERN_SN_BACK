import { Types } from "mongoose";
import {
  connectMongoMemory,
  disconnectMongoMemory,
  dropData,
} from "./_mongoMemory";

import { Favorite } from "@modules/favorites/favorite.model";
import { Like } from "@modules/likes/like.model";
import { createPost, createUser } from "./_factories";

import {
  getPostWithMeta,
  listPostsWithMeta,
} from "@read-models/posts/post.read-service";
import { ApiError } from "@shared/errors/apiError";

describe("INTEGRATION: read-models/posts → post.read-service", () => {
  beforeAll(async () => {
    jest.setTimeout(60_000);
    await connectMongoMemory();
  });
  afterEach(dropData);
  afterAll(disconnectMongoMemory);

  describe("getPostWithMeta", () => {
    it("devuelve meta correcta: likeCount, likedByMe, favoriteCount, favoritedByMe", async () => {
      const alice = await createUser({ username: "alice" });
      const bob = await createUser({ username: "bob" });
      const post = await createPost({ author: alice._id, title: "Hola" });

      await Like.create({
        user: alice._id,
        targetId: post._id,
        targetType: "post",
      });
      await Like.create({
        user: bob._id,
        targetId: post._id,
        targetType: "post",
      });
      await Favorite.create({
        user: bob._id,
        targetId: post._id,
        targetType: "post",
      });

      const out = await getPostWithMeta(
        post._id.toString(),
        alice._id.toString()
      );

      expect(out.id).toBe(post._id.toString());
      expect(out.likeCount).toBe(2);
      expect(out.favoriteCount).toBe(1);
      expect(out.likedByMe).toBe(true);
      expect(out.favoritedByMe).toBe(false);
    });

    it("BAD_REQUEST si postId inválido", async () => {
      await expect(getPostWithMeta("bad-id")).rejects.toBeInstanceOf(ApiError);
    });

    it("NOT_FOUND si el post no existe", async () => {
      const ghost = new Types.ObjectId().toHexString();
      await expect(getPostWithMeta(ghost)).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("listPostsWithMeta", () => {
    it("filtra por authorId, ordena por createdAt DESC y pagina", async () => {
      const alice = await createUser({ username: "alice" });
      const bob = await createUser({ username: "bob" });
      const older = await createPost({
        author: alice._id,
        title: "Old",
        createdAt: new Date(Date.now() - 1_000),
      });
      const newer = await createPost({
        author: alice._id,
        title: "New",
        createdAt: new Date(Date.now() - 100),
      });

      await createPost({ author: bob._id, title: "Bob" });
      await Like.create({
        user: alice._id,
        targetId: newer._id,
        targetType: "post",
      });
      await Favorite.create({
        user: alice._id,
        targetId: newer._id,
        targetType: "post",
      });

      const page1 = await listPostsWithMeta({
        userId: alice._id.toString(),
        authorId: alice._id.toString(),
        page: 1,
        limit: 1,
      });
      expect(page1.total).toBe(2);
      expect(page1.data).toHaveLength(1);
      expect(page1.data[0].id).toBe(newer._id.toString());
      expect(page1.data[0].likedByMe).toBe(true);
      expect(page1.data[0].favoritedByMe).toBe(true);

      const page2 = await listPostsWithMeta({
        userId: alice._id.toString(),
        authorId: alice._id.toString(),
        page: 2,
        limit: 1,
      });
      expect(page2.data).toHaveLength(1);
      expect(page2.data[0].id).toBe(older._id.toString());
      expect(page2.data[0].likedByMe).toBe(false);
      expect(page2.data[0].favoritedByMe).toBe(false);
    });

    it("clamps de paginación (page<1 ⇒ 1; limit fuera de rango)", async () => {
      const alice = await createUser({ username: "alice" });
      await createPost({
        author: alice._id,
        title: "P1",
        createdAt: new Date(Date.now() - 300),
      });
      await createPost({
        author: alice._id,
        title: "P2",
        createdAt: new Date(Date.now() - 200),
      });
      await createPost({
        author: alice._id,
        title: "P3",
        createdAt: new Date(Date.now() - 100),
      });

      const out = await listPostsWithMeta({
        authorId: alice._id.toString(),
        page: -5,
        limit: 999,
      });
      expect(out.page).toBe(1);
      expect(out.limit).toBeLessThanOrEqual(100);
      expect(out.total).toBe(3);
      expect(out.data.length).toBeLessThanOrEqual(100);
    });
  });
});
