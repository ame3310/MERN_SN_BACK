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
  Post: { exists: jest.fn() },
}));
jest.mock("@modules/favorites/favorite.model", () => ({
  Favorite: {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    exists: jest.fn(),
  },
}));

import { Favorite } from "@modules/favorites/favorite.model";
import * as favoriteService from "@modules/favorites/favorite.service";
import { Post } from "@modules/posts/post.model";
import { ERR } from "@shared/constants/error-codes";

const mockedPost = jest.mocked(Post);
const mockedFavorite = jest.mocked(Favorite);

beforeEach(() => {
  jest.clearAllMocks();
  mockedIsValidObjectId.mockReturnValue(true as any);
});

describe("favorite.service (unit)", () => {
  describe("addFavorite", () => {
    it("crea favorito (happy path) para post", async () => {
      mockedPost.exists.mockResolvedValueOnce(true as any);
      mockedFavorite.findOne.mockResolvedValueOnce(null as any);
      mockedFavorite.create.mockResolvedValueOnce({
        user: "u1",
        targetId: "p1",
        targetType: "post",
      } as any);

      const fav = await favoriteService.addFavorite("u1", "p1", "post");

      expect(mockedPost.exists).toHaveBeenCalledWith({ _id: "p1" });
      expect(mockedFavorite.findOne).toHaveBeenCalledWith({
        user: "u1",
        targetId: "p1",
        targetType: "post",
      });
      expect(fav).toMatchObject({
        user: "u1",
        targetId: "p1",
        targetType: "post",
      });
    });

    it("lanza BAD_REQUEST si targetId inválido", async () => {
      mockedIsValidObjectId.mockReturnValueOnce(false as any);

      await expect(
        favoriteService.addFavorite("u1", "bad", "post")
      ).rejects.toMatchObject({ code: ERR.COMMON.BAD_REQUEST });

      expect(mockedPost.exists).not.toHaveBeenCalled();
    });

    it("lanza NOT_FOUND si el post no existe", async () => {
      mockedPost.exists.mockResolvedValueOnce(false as any);

      await expect(
        favoriteService.addFavorite("u1", "p404", "post")
      ).rejects.toMatchObject({ code: ERR.POST.NOT_FOUND });
    });

    it("lanza ALREADY_EXISTS si ya estaba en favoritos", async () => {
      mockedPost.exists.mockResolvedValueOnce(true as any);
      mockedFavorite.findOne.mockResolvedValueOnce({ _id: "f1" } as any);

      await expect(
        favoriteService.addFavorite("u1", "p1", "post")
      ).rejects.toMatchObject({ code: ERR.FAVORITE.ALREADY_EXISTS });
    });
  });

  describe("removeFavorite", () => {
    it("elimina favorito (happy path)", async () => {
      mockedPost.exists.mockResolvedValueOnce(true as any);
      mockedFavorite.findOneAndDelete.mockResolvedValueOnce({
        _id: "f1",
      } as any);

      await favoriteService.removeFavorite("u1", "p1", "post");

      expect(mockedFavorite.findOneAndDelete).toHaveBeenCalledWith({
        user: "u1",
        targetId: "p1",
        targetType: "post",
      });
    });

    it("lanza NOT_FOUND si no existía favorito", async () => {
      mockedPost.exists.mockResolvedValueOnce(true as any);
      mockedFavorite.findOneAndDelete.mockResolvedValueOnce(null as any);

      await expect(
        favoriteService.removeFavorite("u1", "p1", "post")
      ).rejects.toMatchObject({ code: ERR.FAVORITE.NOT_FOUND });
    });
  });

  describe("getFavoriteCount", () => {
    it("devuelve el número de favoritos", async () => {
      mockedFavorite.countDocuments.mockResolvedValueOnce(5 as any);

      const n = await favoriteService.getFavoriteCount("p1", "post");
      expect(n).toBe(5);
    });

    it("lanza BAD_REQUEST si targetId inválido", async () => {
      mockedIsValidObjectId.mockReturnValueOnce(false as any);

      await expect(
        favoriteService.getFavoriteCount("bad", "post")
      ).rejects.toMatchObject({ code: ERR.COMMON.BAD_REQUEST });
    });
  });

  describe("isFavoritedByUser", () => {
    it("false si userId o targetId inválidos (no consulta DB)", async () => {
      mockedIsValidObjectId.mockReturnValueOnce(false as any);

      const r = await favoriteService.isFavoritedByUser("bad", "p1", "post");
      expect(r).toBe(false);
      expect(mockedFavorite.exists).not.toHaveBeenCalled();
    });

    it("true si existe; false si no existe", async () => {
      mockedFavorite.exists
        .mockResolvedValueOnce({ _id: "f1" } as any)
        .mockResolvedValueOnce(null as any);

      const r1 = await favoriteService.isFavoritedByUser("u1", "p1", "post");
      const r2 = await favoriteService.isFavoritedByUser("u1", "p2", "post");

      expect(r1).toBe(true);
      expect(r2).toBe(false);
    });
  });
});
