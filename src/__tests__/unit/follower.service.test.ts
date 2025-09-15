import * as service from "@modules/followers/follower.service";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { Types } from "mongoose";

interface FollowerModelLike {
  findOne: jest.Mock;
  create: jest.Mock;
  findOneAndDelete: jest.Mock;
}
interface UserModelLike {
  exists: jest.Mock;
  findById: jest.Mock;
}

jest.mock("@modules/followers/follower.model", () => ({
  Follower: {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndDelete: jest.fn(),
  },
}));

jest.mock("@modules/users/user.model", () => ({
  User: {
    exists: jest.fn(),
    findById: jest.fn(),
  },
}));

const { Follower: F } = require("@modules/followers/follower.model") as {
  Follower: FollowerModelLike;
};
const { User: U } = require("@modules/users/user.model") as {
  User: UserModelLike;
};

afterEach(() => jest.clearAllMocks());

function followDoc(
  p: Partial<{
    _id: string;
    follower: string;
    followee: string;
    createdAt: Date;
  }> = {}
) {
  return {
    _id: p._id ?? new Types.ObjectId().toHexString(),
    follower: p.follower ?? new Types.ObjectId().toHexString(),
    followee: p.followee ?? new Types.ObjectId().toHexString(),
    createdAt: p.createdAt ?? new Date(),
  };
}

describe("follower.service", () => {
  describe("follow", () => {
    it("crea relación follower→followee cuando el followee existe", async () => {
      const userId = new Types.ObjectId().toHexString();
      const followeeId = new Types.ObjectId().toHexString();

      F.findOne.mockResolvedValueOnce(null);
      U.exists.mockResolvedValueOnce(true as any);
      U.findById.mockResolvedValueOnce({ _id: followeeId } as any);

      const created = followDoc({ follower: userId, followee: followeeId });
      F.create.mockResolvedValueOnce(created);

      const out = await service.follow(userId, followeeId);

      expect(U.exists.mock.calls.length + U.findById.mock.calls.length).toBe(1);
      expect(F.findOne).toHaveBeenCalledWith({
        follower: userId,
        followee: followeeId,
      });
      expect(F.create).toHaveBeenCalledWith({
        follower: userId,
        followee: followeeId,
      });
      expect(out).toBe(created);
    });

    it("lanza BAD_REQUEST si userId inválido", async () => {
      const followeeId = new Types.ObjectId().toHexString();
      await expect(service.follow("bad", followeeId)).rejects.toMatchObject({
        code: ERR.COMMON.BAD_REQUEST,
      });
      expect(F.findOne).not.toHaveBeenCalled();
      expect(F.create).not.toHaveBeenCalled();
      expect(U.exists).not.toHaveBeenCalled();
      expect(U.findById).not.toHaveBeenCalled();
    });

    it("lanza BAD_REQUEST si followeeId inválido", async () => {
      const userId = new Types.ObjectId().toHexString();
      await expect(service.follow(userId, "bad")).rejects.toMatchObject({
        code: ERR.COMMON.BAD_REQUEST,
      });
      expect(F.findOne).not.toHaveBeenCalled();
      expect(F.create).not.toHaveBeenCalled();
      expect(U.exists).not.toHaveBeenCalled();
      expect(U.findById).not.toHaveBeenCalled();
    });

    it("lanza NOT_FOUND si el followee NO existe", async () => {
      const userId = new Types.ObjectId().toHexString();
      const followeeId = new Types.ObjectId().toHexString();

      F.findOne.mockResolvedValueOnce(null);
      U.exists.mockResolvedValueOnce(null as any);
      U.findById.mockResolvedValueOnce(null);

      await expect(service.follow(userId, followeeId)).rejects.toMatchObject({
        code: ERR.USER.NOT_FOUND,
      });

      expect(U.exists.mock.calls.length + U.findById.mock.calls.length).toBe(1);
      expect(F.create).not.toHaveBeenCalled();
    });

    it("no permite seguirse a sí mism@", async () => {
      const me = new Types.ObjectId().toHexString();
      await expect(service.follow(me, me)).rejects.toBeInstanceOf(ApiError);
      expect(F.findOne).not.toHaveBeenCalled();
      expect(F.create).not.toHaveBeenCalled();
      expect(U.exists).not.toHaveBeenCalled();
      expect(U.findById).not.toHaveBeenCalled();
    });

    it("rechaza si ya existía la relación (pre-check o índice único 11000)", async () => {
      const userId = new Types.ObjectId().toHexString();
      const followeeId = new Types.ObjectId().toHexString();

      U.exists.mockResolvedValue(true as any);
      U.findById.mockResolvedValue({ _id: followeeId } as any);

      const existing = followDoc({ follower: userId, followee: followeeId });
      F.findOne.mockResolvedValue(existing);
      F.create.mockRejectedValue({ code: 11000 });

      try {
        await service.follow(userId, followeeId);
        throw new Error("debió rechazar por relación existente");
      } catch (err: any) {
        if (err instanceof ApiError) {
          expect(err).toMatchObject({ code: ERR.FOLLOW.ALREADY_FOLLOWING });
          expect(F.create).not.toHaveBeenCalled(); 
        } else {
          expect(err).toMatchObject({ code: 11000 }); 
          expect(F.create).toHaveBeenCalledTimes(1);
        }
        expect(F.findOne).toHaveBeenCalledWith({
          follower: userId,
          followee: followeeId,
        });
      }
    });
  });

  describe("unfollow", () => {
    it("elimina relación si existía", async () => {
      const userId = new Types.ObjectId().toHexString();
      const followeeId = new Types.ObjectId().toHexString();

      F.findOneAndDelete.mockResolvedValueOnce(
        followDoc({ follower: userId, followee: followeeId })
      );

      await expect(
        service.unfollow(userId, followeeId)
      ).resolves.toBeUndefined();
      expect(F.findOneAndDelete).toHaveBeenCalledWith({
        follower: userId,
        followee: followeeId,
      });
    });

    it("lanza NOT_FOUND si no seguías a ese usuario", async () => {
      const userId = new Types.ObjectId().toHexString();
      const followeeId = new Types.ObjectId().toHexString();

      F.findOneAndDelete.mockResolvedValueOnce(null);

      await expect(service.unfollow(userId, followeeId)).rejects.toMatchObject({
        code: ERR.FOLLOW.NOT_FOLLOWING,
      });
    });

    it("lanza BAD_REQUEST si IDs inválidos", async () => {
      const ok = new Types.ObjectId().toHexString();

      await expect(service.unfollow("bad", ok)).rejects.toMatchObject({
        code: ERR.COMMON.BAD_REQUEST,
      });
      await expect(service.unfollow(ok, "bad")).rejects.toMatchObject({
        code: ERR.COMMON.BAD_REQUEST,
      });
      expect(F.findOneAndDelete).not.toHaveBeenCalled();
    });
  });
});
