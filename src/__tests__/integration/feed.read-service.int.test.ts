import { Favorite } from "@modules/favorites/favorite.model";
import { Like } from "@modules/likes/like.model";
import { getFeed, getUserFeed } from "@read-models/feeds/feed.read-service";
import { ApiError } from "@shared/errors/apiError";
import { createPost, createUser, follow } from "./_factories";
import {
  connectMongoMemory,
  disconnectMongoMemory,
  dropData,
} from "./_mongoMemory";

describe("INTEGRATION: read-models/feeds → feed.read-service", () => {
  beforeAll(async () => {
    jest.setTimeout(60_000);
    await connectMongoMemory();
  });
  afterEach(dropData);
  afterAll(disconnectMongoMemory);

  describe("getFeed", () => {
    it("devuelve vacío si no sigues a nadie y no includeSelf", async () => {
      const viewer = await createUser({ username: "viewer" });
      await createUser({ username: "other" });
      const out = await getFeed({
        viewerId: viewer._id.toString(),
        page: 1,
        limit: 10,
      });
      expect(out).toEqual({ data: [], page: 1, limit: 10, total: 0 });
    });

    it("includeSelf=true incluye mis posts, ordenados y con meta", async () => {
      const viewer = await createUser({
        username: "alice",
        email: "alice@test.com",
      });

      const older = await createPost({
        author: viewer._id,
        title: "Old",
        createdAt: new Date(Date.now() - 1000),
      });
      const newer = await createPost({
        author: viewer._id,
        title: "New",
        createdAt: new Date(Date.now() - 100),
      });

      await Like.create({
        user: viewer._id,
        targetId: newer._id,
        targetType: "post",
      });
      await Favorite.create({
        user: viewer._id,
        targetId: newer._id,
        targetType: "post",
      });

      const out = await getFeed({
        viewerId: viewer._id.toString(),
        includeSelf: true,
        page: 1,
        limit: 10,
      });

      expect(out.total).toBe(2);
      expect(out.data.map((p) => p.id)).toEqual([
        newer._id.toString(),
        older._id.toString(),
      ]);

      const first = out.data[0];
      const second = out.data[1];

      expect(first.likeCount).toBe(1);
      expect(first.likedByMe).toBe(true);
      expect(first.favoriteCount).toBe(1);
      expect(first.favoritedByMe).toBe(true);

      expect(second.likeCount).toBe(0);
      expect(second.likedByMe).toBe(false);
      expect(second.favoriteCount).toBe(0);
      expect(second.favoritedByMe).toBe(false);
    });

    it("incluye posts de seguidos (follower → followee) y pagina", async () => {
      const viewer = await createUser({ username: "viewer" });
      const bob = await createUser({ username: "bob" });

      await follow(viewer._id, bob._id);

      const p1 = await createPost({
        author: bob._id,
        title: "P1",
        createdAt: new Date(Date.now() - 300),
      });
      const p2 = await createPost({
        author: bob._id,
        title: "P2",
        createdAt: new Date(Date.now() - 200),
      });
      const p3 = await createPost({
        author: bob._id,
        title: "P3",
        createdAt: new Date(Date.now() - 100),
      });

      await Like.create({
        user: viewer._id,
        targetId: p3._id,
        targetType: "post",
      });
      await Favorite.create({
        user: viewer._id,
        targetId: p3._id,
        targetType: "post",
      });

      const page1 = await getFeed({
        viewerId: viewer._id.toString(),
        page: 1,
        limit: 2,
      });
      expect(page1.total).toBe(3);
      expect(page1.data.map((p) => p.id)).toEqual([
        p3._id.toString(),
        p2._id.toString(),
      ]);
      expect(page1.data[0].likedByMe).toBe(true);
      expect(page1.data[0].favoritedByMe).toBe(true);

      const page2 = await getFeed({
        viewerId: viewer._id.toString(),
        page: 2,
        limit: 2,
      });
      expect(page2.data.map((p) => p.id)).toEqual([p1._id.toString()]);
    });

    it("lanza BAD_REQUEST si viewerId inválido", async () => {
      await expect(getFeed({ viewerId: "bad" as any })).rejects.toBeInstanceOf(
        ApiError
      );
    });
  });

  describe("getUserFeed", () => {
    it("toma followees del userId y calcula meta con viewerId (distinto)", async () => {
      const owner = await createUser({ username: "owner" });
      const viewer = await createUser({ username: "viewer" });
      const followed = await createUser({ username: "followed" });

      await follow(owner._id, followed._id);

      const post = await createPost({
        author: followed._id,
        title: "ByFollowed",
      });
      await Like.create({
        user: viewer._id,
        targetId: post._id,
        targetType: "post",
      });

      const out = await getUserFeed({
        userId: owner._id.toString(),
        viewerId: viewer._id.toString(),
        page: 1,
        limit: 10,
      });

      expect(out.total).toBe(1);
      expect(out.data[0].id).toBe(post._id.toString());
      expect(out.data[0].likedByMe).toBe(true);
      expect(out.data[0].favoritedByMe).toBe(false);
    });

    it("includeSelf=true añade posts del propio userId aunque no siga a nadie", async () => {
      const owner = await createUser({ username: "solo" });
      const p = await createPost({ author: owner._id, title: "mine" });

      const out = await getUserFeed({
        userId: owner._id.toString(),
        includeSelf: true,
        page: 1,
        limit: 10,
      });
      expect(out.total).toBe(1);
      expect(out.data[0].id).toBe(p._id.toString());
    });

    it("BAD_REQUEST si userId inválido", async () => {
      await expect(
        getUserFeed({ userId: "bad" as any })
      ).rejects.toBeInstanceOf(ApiError);
    });
  });
});
