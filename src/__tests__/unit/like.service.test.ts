import mongoose from "mongoose";

jest.mock("mongoose", () => {
  const actual = jest.requireActual("mongoose");
  return {
    ...actual,
    isValidObjectId: jest.fn(),
  };
});
const mockedIsValidObjectId = jest.mocked(mongoose.isValidObjectId);

jest.mock("@modules/posts/post.model", () => ({
  Post: {
    exists: jest.fn(),
  },
}));
jest.mock("@modules/comments/comment.model", () => ({
  Comment: {
    exists: jest.fn(),
  },
}));
jest.mock("@modules/likes/like.model", () => ({
  Like: {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    exists: jest.fn(),
  },
}));

import { Comment } from "@modules/comments/comment.model";
import { Like } from "@modules/likes/like.model";
import * as likeService from "@modules/likes/like.service";
import { Post } from "@modules/posts/post.model";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";

const mockedPost = jest.mocked(Post);
const mockedComment = jest.mocked(Comment);
const mockedLike = jest.mocked(Like);

beforeEach(() => {
  jest.clearAllMocks();
  mockedIsValidObjectId.mockReturnValue(true as any);
});

describe("like.service (unit)", () => {
  describe("likeTarget", () => {
    it("likea post (happy path)", async () => {
      mockedPost.exists.mockResolvedValueOnce(true as any);
      mockedLike.findOne.mockResolvedValueOnce(null as any);
      mockedLike.create.mockResolvedValueOnce({
        _id: "3artui6",
        user: "u1",
        targetId: "p1",
        targetType: "post",
        createdAt: new Date(),
      } as any);

      const result = await likeService.likeTarget("u1", "p1", "post");

      expect(mockedPost.exists).toHaveBeenCalledWith({ _id: "p1" });
      expect(mockedLike.findOne).toHaveBeenCalledWith({
        user: "u1",
        targetId: "p1",
        targetType: "post",
      });
      expect(result).toMatchObject({
        userId: "u1",
        targetId: "p1",
        targetType: "post",
      });
    });

    it("lanza BAD_REQUEST si ID inválido", async () => {
      mockedIsValidObjectId.mockReturnValueOnce(false as any);

      await expect(
        likeService.likeTarget("u1", "bad", "post")
      ).rejects.toBeInstanceOf(ApiError);

      expect(mockedPost.exists).not.toHaveBeenCalled();
    });

    it("lanza NOT_FOUND si el target no existe (post)", async () => {
      mockedPost.exists.mockResolvedValueOnce(false as any);

      await expect(
        likeService.likeTarget("u1", "p404", "post")
      ).rejects.toMatchObject({ code: ERR.POST.NOT_FOUND });
    });

    it("lanza BAD_REQUEST si ya existía like", async () => {
      mockedPost.exists.mockResolvedValueOnce(true as any);
      mockedLike.findOne.mockResolvedValueOnce({ _id: "3artui6" } as any);

      await expect(
        likeService.likeTarget("u1", "p1", "post")
      ).rejects.toMatchObject({ code: ERR.LIKE.ALREADY_EXISTS });
    });

    it("funciona también con comments como target", async () => {
      mockedComment.exists.mockResolvedValueOnce(true as any);
      mockedLike.findOne.mockResolvedValueOnce(null as any);
      mockedLike.create.mockResolvedValueOnce({
        _id: "3artui6",
        user: "u1",
        targetId: "c1",
        targetType: "comment",
      } as any);

      const result = await likeService.likeTarget("u1", "c1", "comment");
      expect(mockedComment.exists).toHaveBeenCalledWith({ _id: "c1" });
      expect(result.targetType).toBe("comment");
    });

    it("lanza BAD_REQUEST si targetType inválido (forzado)", async () => {
      await expect(
        likeService.likeTarget("u1", "x1", "photo" as any)
      ).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("unlikeTarget", () => {
    it("borra like existente (happy path)", async () => {
      mockedPost.exists.mockResolvedValueOnce(true as any);
      mockedLike.findOneAndDelete.mockResolvedValueOnce({
        _id: "3artui6",
      } as any);

      await likeService.unlikeTarget("u1", "p1", "post");

      expect(mockedLike.findOneAndDelete).toHaveBeenCalledWith({
        user: "u1",
        targetId: "p1",
        targetType: "post",
      });
    });

    it("lanza NOT_FOUND si no existía like", async () => {
      mockedPost.exists.mockResolvedValueOnce(true as any);
      mockedLike.findOneAndDelete.mockResolvedValueOnce(null as any);

      await expect(
        likeService.unlikeTarget("u1", "p1", "post")
      ).rejects.toMatchObject({ code: ERR.LIKE.NOT_FOUND });
    });
  });

  describe("getLikeCount", () => {
    it("devuelve el número de likes", async () => {
      mockedLike.countDocuments.mockResolvedValueOnce(7 as any);

      const n = await likeService.getLikeCount("p1", "post");
      expect(n).toBe(7);
    });

    it("lanza BAD_REQUEST si targetId inválido", async () => {
      mockedIsValidObjectId.mockReturnValueOnce(false as any);

      await expect(
        likeService.getLikeCount("bad", "post")
      ).rejects.toMatchObject({ code: ERR.COMMON.BAD_REQUEST });
    });
  });

  describe("isLikedByUser", () => {
    it("false si userId o targetId inválidos (sin consultar DB)", async () => {
      mockedIsValidObjectId.mockReturnValueOnce(false as any);
      const r1 = await likeService.isLikedByUser("bad-user", "p1", "post");
      expect(r1).toBe(false);
      expect(mockedLike.exists).not.toHaveBeenCalled();

      mockedIsValidObjectId.mockReset();
      mockedIsValidObjectId.mockImplementation((v: any) => v !== "bad-target");
      const r2 = await likeService.isLikedByUser("u1", "bad-target", "post");
      expect(r2).toBe(false);
      expect(mockedLike.exists).not.toHaveBeenCalled();
    });

    it("true si existe like; false si no existe", async () => {
      mockedLike.exists
        .mockResolvedValueOnce({ _id: "3artui6" } as any)
        .mockResolvedValueOnce(null as any);

      const r1 = await likeService.isLikedByUser("u1", "p1", "post");
      const r2 = await likeService.isLikedByUser("u1", "p2", "post");

      expect(r1).toBe(true);
      expect(r2).toBe(false);
    });
  });
});
