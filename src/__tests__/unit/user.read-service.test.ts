import { Follower } from "@modules/followers/follower.model";
import { Post } from "@modules/posts/post.model";
import { User } from "@modules/users/user.model";
import * as userReadService from "@read-models/users/user.read-service";
import { ERR } from "@shared/constants/error-codes";
import { Types } from "mongoose";

jest.mock("@modules/users/user.model");
jest.mock("@modules/posts/post.model");
jest.mock("@modules/followers/follower.model");

jest.mock("@modules/users/user.types", () => ({
  toPublicUser: (u: any) => ({
    id: u._id?.toString?.() ?? u.id ?? "id",
    email: u.email,
    role: u.role ?? "user",
    username: u.username ?? "user",
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
  }),
}));

const mockedUser = jest.mocked(User);
const mockedPost = jest.mocked(Post);
const mockedFollower = jest.mocked(Follower);

beforeEach(() => jest.clearAllMocks());

describe("user.read-service", () => {
  describe("getUserPublicProfile", () => {
    it("BAD_REQUEST si el ID no es válido", async () => {
      await expect(
        userReadService.getUserPublicProfile("bad-id")
      ).rejects.toMatchObject({ code: ERR.COMMON.BAD_REQUEST });
    });

    it("NOT_FOUND si el usuario no existe", async () => {
      const uid = new Types.ObjectId().toHexString();
      mockedUser.findById.mockResolvedValueOnce(null);

      await expect(
        userReadService.getUserPublicProfile(uid)
      ).rejects.toMatchObject({ code: ERR.USER.NOT_FOUND });
      expect(mockedUser.findById).toHaveBeenCalledWith(uid);
    });

    it("devuelve perfil público con contadores e isFollowedByMe=true", async () => {
      const uid = new Types.ObjectId().toHexString();
      const viewerId = new Types.ObjectId().toHexString();

      mockedUser.findById.mockResolvedValueOnce({
        _id: uid,
        email: "a@test.com",
        role: "user",
        username: "john",
      } as any);

      mockedPost.countDocuments.mockResolvedValueOnce(5);
      mockedFollower.countDocuments.mockResolvedValueOnce(10);
      mockedFollower.countDocuments.mockResolvedValueOnce(3);
      mockedFollower.exists.mockResolvedValueOnce({ _id: "rel" } as any);

      const out = await userReadService.getUserPublicProfile(uid, viewerId);

      expect(out).toMatchObject({
        id: uid,
        email: "a@test.com",
        role: "user",
        username: "john",
        postCount: 5,
        followerCount: 10,
        followingCount: 3,
        isFollowedByMe: true,
      });
      expect(mockedFollower.exists).toHaveBeenCalled();
    });

    it("isFollowedByMe=false si viewer no sigue", async () => {
      const uid = new Types.ObjectId().toHexString();
      const viewerId = new Types.ObjectId().toHexString();

      mockedUser.findById.mockResolvedValueOnce({
        _id: uid,
        email: "a@test.com",
      } as any);
      mockedPost.countDocuments.mockResolvedValueOnce(1);
      mockedFollower.countDocuments.mockResolvedValueOnce(0);
      mockedFollower.countDocuments.mockResolvedValueOnce(0);
      mockedFollower.exists.mockResolvedValueOnce(null);

      const out = await userReadService.getUserPublicProfile(uid, viewerId);
      expect(out.isFollowedByMe).toBe(false);
    });

    it("sin viewerId: no consulta exists e isFollowedByMe=false", async () => {
      const uid = new Types.ObjectId().toHexString();

      mockedUser.findById.mockResolvedValueOnce({
        _id: uid,
        email: "a@test.com",
      } as any);
      mockedPost.countDocuments.mockResolvedValueOnce(0);
      mockedFollower.countDocuments.mockResolvedValueOnce(0);
      mockedFollower.countDocuments.mockResolvedValueOnce(0);

      const out = await userReadService.getUserPublicProfile(uid);

      expect(out.isFollowedByMe).toBe(false);
      expect(mockedFollower.exists).not.toHaveBeenCalled();
    });
  });

  describe("listUsers", () => {
    it("devuelve lista paginada (con q)", async () => {
      mockedUser.find.mockReturnValueOnce({
        sort: () => ({
          skip: () => ({
            limit: () =>
              Promise.resolve([
                { _id: "u1", email: "a@test.com", username: "aa" },
              ]),
          }),
        }),
      } as any);
      mockedUser.countDocuments.mockResolvedValueOnce(1);

      const res = await userReadService.listUsers({
        q: "a",
        page: 1,
        limit: 10,
      });

      expect(res.total).toBe(1);
      expect(res.data[0]).toMatchObject({ email: "a@test.com" });
      expect(mockedUser.find).toHaveBeenCalled();
    });

    it("búsqueda sin q", async () => {
      mockedUser.find.mockReturnValueOnce({
        sort: () => ({
          skip: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      } as any);
      mockedUser.countDocuments.mockResolvedValueOnce(0);

      const res = await userReadService.listUsers({});
      expect(res.total).toBe(0);
      expect(res.data).toEqual([]);
    });
  });

  describe("isUsernameAvailable", () => {
    it("true si no hay colisión", async () => {
      mockedUser.findByUsername.mockResolvedValueOnce(null);
      const res = await userReadService.isUsernameAvailable("johnny");
      expect(res).toEqual({ available: true });
    });

    it("false si ya existe", async () => {
      mockedUser.findByUsername.mockResolvedValueOnce({ _id: "u1" } as any);
      const res = await userReadService.isUsernameAvailable("johnny");
      expect(res).toEqual({ available: false });
    });
  });
});
