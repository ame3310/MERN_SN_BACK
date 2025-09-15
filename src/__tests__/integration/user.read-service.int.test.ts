import * as readService from "@read-models/users/user.read-service";
import { ApiError } from "@shared/errors/apiError";
import { Types } from "mongoose";
import { createPost, createUser, follow } from "./_factories";
import {
  connectMongoMemory,
  disconnectMongoMemory,
  dropData,
} from "./_mongoMemory";

describe("INTEGRATION: read-models/users → user.read-service", () => {
  beforeAll(async () => {
    jest.setTimeout(60_000);
    await connectMongoMemory();
  });
  afterEach(dropData);
  afterAll(disconnectMongoMemory);

  describe("getUserPublicProfile", () => {
    it("perfil con contadores e isFollowedByMe", async () => {
      const alice = await createUser({ username: "alice" });
      const bob = await createUser({ username: "bob" });
      const carol = await createUser({ username: "carol" });

      await createPost({ author: alice._id, title: "A1" });
      await createPost({ author: alice._id, title: "A2" });
      await createPost({ author: bob._id, title: "B1" });

      await follow(bob._id, alice._id);
      await follow(carol._id, alice._id);
      await follow(alice._id, bob._id);

      const out = await readService.getUserPublicProfile(
        alice._id.toString(),
        bob._id.toString()
      );

      expect(out).toMatchObject({
        id: alice.id,
        email: alice.email,
        username: "alice",
        postCount: 2,
        followerCount: 2,
        followingCount: 1,
        isFollowedByMe: true,
      });
    });

    it("BAD_REQUEST si ID inválido", async () => {
      await expect(
        readService.getUserPublicProfile("bad-id")
      ).rejects.toBeInstanceOf(ApiError);
    });

    it("NOT_FOUND si usuario no existe", async () => {
      const ghost = new Types.ObjectId().toHexString();
      await expect(
        readService.getUserPublicProfile(ghost)
      ).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("listUsers", () => {
    it("busca por query y pagina", async () => {
      const u1 = await createUser({ username: "alice", email: "a@test.com" });
      const u2 = await createUser({ username: "bob", email: "b@test.com" });
      await createUser({ username: "charlie", email: "charlie@sample.com" });

      const p1 = await readService.listUsers({ q: "test", page: 1, limit: 1 });
      const p2 = await readService.listUsers({ q: "test", page: 2, limit: 1 });

      expect(p1.total).toBe(2);
      expect(p1.data).toHaveLength(1);
      expect(p2.data).toHaveLength(1);

      const ids = [...p1.data, ...p2.data].map((x) => x.id).sort();
      expect(ids).toEqual([u1.id, u2.id].sort());

      const all = await readService.listUsers({ page: 1, limit: 10 });
      expect(all.total).toBe(3);
      expect(all.data).toHaveLength(3);
    });
  });

  describe("isUsernameAvailable", () => {
    it("case-insensitive (sin espacios porque se valida antes del trim)", async () => {
      await createUser({ username: "dave", email: "d@test.com" });

      expect((await readService.isUsernameAvailable("dave")).available).toBe(
        false
      );
      expect((await readService.isUsernameAvailable("DaVe")).available).toBe(
        false
      );
      expect((await readService.isUsernameAvailable("eva")).available).toBe(
        true
      );
    });
  });
});
