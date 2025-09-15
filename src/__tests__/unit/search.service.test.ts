import type { PublicPost } from "@modules/posts/post.types";
import * as service from "@modules/searches/search.service";
import type { PublicUser } from "@modules/users/user.types";
import { ERR } from "@shared/constants/error-codes";

interface UserModelLike {
  find: jest.Mock;
}
interface PostModelLike {
  find: jest.Mock;
}

jest.mock("@modules/users/user.model", () => ({
  User: { find: jest.fn() },
}));
jest.mock("@modules/posts/post.model", () => ({
  Post: { find: jest.fn() },
}));

jest.mock("@modules/users/user.types", () => ({
  toPublicUser: jest.fn(
    (u: any) =>
      ({
        id: String(u._id ?? u.id ?? "u1"),
        email: String(u.email ?? "a@b.com"),
        role: (u.role ?? "user") as "user" | "admin",
        username: String(u.username ?? "user"),
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
      } satisfies PublicUser)
  ),
}));

jest.mock("@modules/posts/post.types", () => ({
  toPublicPost: jest.fn(
    (p: any) =>
      ({
        id: String(p._id ?? p.id ?? "p1"),
        authorId: String(p.author?._id ?? p.authorId ?? "u1"),
        title: String(p.title ?? ""),
        content: String(p.content ?? ""),
        images: Array.isArray(p.images) ? p.images : [],
        createdAt: (p.createdAt ?? new Date()).toISOString(),
        updatedAt: p.updatedAt
          ? new Date(p.updatedAt).toISOString()
          : undefined,
      } satisfies PublicPost)
  ),
}));

const { User } = require("@modules/users/user.model") as {
  User: UserModelLike;
};
const { Post } = require("@modules/posts/post.model") as {
  Post: PostModelLike;
};
const { toPublicUser } = require("@modules/users/user.types") as {
  toPublicUser: jest.Mock;
};
const { toPublicPost } = require("@modules/posts/post.types") as {
  toPublicPost: jest.Mock;
};

afterEach(() => jest.clearAllMocks());

describe("search.service", () => {
  describe("searchUsers", () => {
    it("devuelve usuarios mapeados cuando hay resultados", async () => {
      const query = "test";
      const rows = [
        { _id: "u1", email: "a@test.com", username: "alice" },
        { _id: "u2", email: "b@test.com", username: "bob" },
      ];

      (User.find as jest.Mock).mockResolvedValueOnce(rows);

      toPublicUser
        .mockReturnValueOnce({
          id: "u1",
          email: "a@test.com",
          role: "user",
          username: "alice",
        } as PublicUser)
        .mockReturnValueOnce({
          id: "u2",
          email: "b@test.com",
          role: "user",
          username: "bob",
        } as PublicUser);

      const out = await service.searchUsers(query);

      expect(User.find).toHaveBeenCalledWith({
        email: { $regex: query, $options: "i" },
      });
      expect(toPublicUser).toHaveBeenCalledTimes(2);
      expect(out).toEqual<PublicUser[]>([
        { id: "u1", email: "a@test.com", role: "user", username: "alice" },
        { id: "u2", email: "b@test.com", role: "user", username: "bob" },
      ]);
    });

    it("lanza NOT_FOUND (ERR.SEARCH.NO_RESULTS) si no hay usuarios", async () => {
      (User.find as jest.Mock).mockResolvedValueOnce([]);
      await expect(service.searchUsers("none")).rejects.toMatchObject({
        code: ERR.SEARCH.NO_RESULTS,
      });
      expect(toPublicUser).not.toHaveBeenCalled();
    });
  });

  describe("searchPosts", () => {
    function mockPopulateChain(rows: any[]) {
      const populate = jest.fn().mockResolvedValueOnce(rows);
      (Post.find as jest.Mock).mockReturnValueOnce({ populate });
      return { populate };
    }

    it("devuelve posts mapeados cuando hay resultados", async () => {
      const query = "hello";
      const rows = [
        {
          _id: "p1",
          title: "hello",
          content: "world",
          author: { _id: "u1" },
          createdAt: new Date(),
        },
        {
          _id: "p2",
          title: "hi",
          content: "there",
          author: { _id: "u2" },
          createdAt: new Date(),
        },
      ];

      const { populate } = mockPopulateChain(rows);

      toPublicPost
        .mockReturnValueOnce({
          id: "p1",
          authorId: "u1",
          title: "hello",
          content: "world",
          images: [],
          createdAt: rows[0].createdAt.toISOString(),
        } as PublicPost)
        .mockReturnValueOnce({
          id: "p2",
          authorId: "u2",
          title: "hi",
          content: "there",
          images: [],
          createdAt: rows[1].createdAt.toISOString(),
        } as PublicPost);

      const out = await service.searchPosts(query);

      expect(Post.find).toHaveBeenCalledWith({
        $or: [
          { title: { $regex: query, $options: "i" } },
          { content: { $regex: query, $options: "i" } },
        ],
      });
      expect(populate).toHaveBeenCalledWith("author");
      expect(toPublicPost).toHaveBeenCalledTimes(2);
      expect(out.map((p) => p.id)).toEqual(["p1", "p2"]);
    });

    it("lanza NOT_FOUND (ERR.SEARCH.NO_RESULTS) si no hay posts", async () => {
      mockPopulateChain([]);
      await expect(service.searchPosts("zzz")).rejects.toMatchObject({
        code: ERR.SEARCH.NO_RESULTS,
      });
      expect(toPublicPost).not.toHaveBeenCalled();
    });
  });
});
