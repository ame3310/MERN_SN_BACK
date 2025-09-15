import { Follower } from "@modules/followers/follower.model";
import {
  listFollowers,
  listFollowing,
} from "@read-models/followers/follower.read-service";
import { ApiError } from "@shared/errors/apiError";
import { createUser } from "./_factories";
import {
  connectMongoMemory,
  disconnectMongoMemory,
  dropData,
} from "./_mongoMemory";

describe("INTEGRATION: read-models/followers → follower.read-service", () => {
  beforeAll(async () => {
    jest.setTimeout(60_000);
    await connectMongoMemory();
  });
  afterEach(dropData);
  afterAll(disconnectMongoMemory);

  describe("listFollowers", () => {
    it("lista usuarios que SIGUEN a X (followers), ordenados por createdAt DESC y con paginación", async () => {
      const alice = await createUser({ username: "alice" });
      const bob = await createUser({ username: "bob" });
      const carol = await createUser({ username: "carol" });

      await Follower.create({
        follower: bob._id,
        followee: alice._id,
        createdAt: new Date(Date.now() - 1000),
      } as any);
      await Follower.create({
        follower: carol._id,
        followee: alice._id,
        createdAt: new Date(Date.now() - 100),
      } as any);

      const p1 = await listFollowers({
        userId: alice._id.toString(),
        page: 1,
        limit: 1,
      });
      expect(p1.page).toBe(1);
      expect(p1.limit).toBe(1);
      expect(p1.total).toBe(2);
      expect(p1.data).toHaveLength(1);
      expect(p1.data[0].id).toBe(carol.id);
      expect(p1.data[0].username).toBe("carol");

      const p2 = await listFollowers({
        userId: alice._id.toString(),
        page: 2,
        limit: 1,
      });
      expect(p2.page).toBe(2);
      expect(p2.limit).toBe(1);
      expect(p2.total).toBe(2);
      expect(p2.data).toHaveLength(1);
      expect(p2.data[0].id).toBe(bob.id);
      expect(p2.data[0].username).toBe("bob");
    });

    it("devuelve vacío si no tiene followers", async () => {
      const dave = await createUser({ username: "dave" });
      const out = await listFollowers({
        userId: dave._id.toString(),
        page: 1,
        limit: 10,
      });
      expect(out).toEqual({ data: [], page: 1, limit: 10, total: 0 });
    });

    it("lanza BAD_REQUEST si userId es inválido", async () => {
      await expect(
        listFollowers({ userId: "bad-id" as any })
      ).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("listFollowing", () => {
    it("lista usuarios a los que X SIGUE (following), ordenados por createdAt DESC y con paginación", async () => {
      const eva = await createUser({ username: "eva" });
      const frank = await createUser({ username: "frank" });
      const gina = await createUser({ username: "gina" });

      await Follower.create({
        follower: eva._id,
        followee: frank._id,
        createdAt: new Date(Date.now() - 1000),
      } as any);
      await Follower.create({
        follower: eva._id,
        followee: gina._id,
        createdAt: new Date(Date.now() - 100),
      } as any);

      const p1 = await listFollowing({
        userId: eva._id.toString(),
        page: 1,
        limit: 5,
      });
      expect(p1.total).toBe(2);
      expect(p1.data.map((u) => u.username)).toEqual(["gina", "frank"]);

      const p2 = await listFollowing({
        userId: eva._id.toString(),
        page: 2,
        limit: 1,
      });
      expect(p2.page).toBe(2);
      expect(p2.limit).toBe(1);
      expect(p2.total).toBe(2);
      expect(p2.data).toHaveLength(1);
      expect(p2.data[0].username).toBe("frank");
    });

    it("devuelve vacío si no sigue a nadie", async () => {
      const heidi = await createUser({ username: "heidi" });
      const out = await listFollowing({
        userId: heidi._id.toString(),
        page: 1,
        limit: 10,
      });
      expect(out).toEqual({ data: [], page: 1, limit: 10, total: 0 });
    });

    it("lanza BAD_REQUEST si userId es inválido", async () => {
      await expect(
        listFollowing({ userId: "bad-id" as any })
      ).rejects.toBeInstanceOf(ApiError);
    });
  });
});
