import * as service from "@modules/users/user.service";
import type { PublicUser } from "@modules/users/user.types";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";

interface UserModelLike {
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
}

jest.mock("@modules/users/user.model", () => ({
  User: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock("@modules/users/user.types", () => ({
  toPublicUser: jest.fn(
    (doc: any) =>
      ({
        id: String(doc._id ?? doc.id ?? "u1"),
        email: String(doc.email ?? "a@b.com"),
        role: (doc.role ?? "user") as "user" | "admin",
        username: String(doc.username ?? "user"),
        displayName: doc.displayName,
        avatarUrl: doc.avatarUrl,
        bio: doc.bio,
      } satisfies PublicUser)
  ),
}));

const { User: M } = require("@modules/users/user.model") as {
  User: UserModelLike;
};
const { toPublicUser } = require("@modules/users/user.types") as {
  toPublicUser: jest.Mock;
};

afterEach(() => jest.clearAllMocks());

function userDoc(
  p: Partial<{
    _id: string;
    id: string;
    email: string;
    role: "user" | "admin";
    username: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  }> = {}
) {
  return {
    _id: p._id ?? p.id ?? "64f000000000000000000001",
    email: p.email ?? "u@test.com",
    role: p.role ?? "user",
    username: p.username ?? "user",
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    bio: p.bio,
  };
}

describe("users.service", () => {
  describe("getById", () => {
    it("devuelve PublicUser si existe", async () => {
      const doc = userDoc({
        _id: "64f000000000000000000001",
        email: "x@y.com",
        username: "neo",
      });
      M.findById.mockResolvedValueOnce(doc);

      const dto: PublicUser = {
        id: String(doc._id),
        email: doc.email,
        role: doc.role,
        username: doc.username,
        displayName: doc.displayName,
        avatarUrl: doc.avatarUrl,
        bio: doc.bio,
      };
      toPublicUser.mockReturnValueOnce(dto);

      const out = await service.getById(String(doc._id));

      expect(M.findById).toHaveBeenCalledWith(String(doc._id));
      expect(toPublicUser).toHaveBeenCalledWith(doc);
      expect(out).toEqual(dto);
    });

    it("lanza NOT_FOUND si no existe", async () => {
      M.findById.mockResolvedValueOnce(null);

      await expect(
        service.getById("64f000000000000000000099")
      ).rejects.toMatchObject({ code: ERR.USER.NOT_FOUND });
    });
  });

  describe("updateMe", () => {
    it("actualiza y devuelve el PublicUser", async () => {
      const id = "64f000000000000000000002";
      const data = { avatarUrl: "https://cdn/a.png", bio: "hello" };
      const updated = userDoc({
        _id: id,
        ...data,
        email: "z@z.com",
        username: "trinity",
      });

      M.findByIdAndUpdate.mockResolvedValueOnce(updated);

      const dto: PublicUser = {
        id,
        email: updated.email,
        role: updated.role,
        username: updated.username,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
      };
      toPublicUser.mockReturnValueOnce(dto);

      const out = await service.updateMe(id, data);

      expect(M.findByIdAndUpdate).toHaveBeenCalledWith(id, data, { new: true });
      expect(toPublicUser).toHaveBeenCalledWith(updated);
      expect(out).toEqual(dto);
    });

    it("lanza NOT_FOUND si no encuentra el usuario", async () => {
      M.findByIdAndUpdate.mockResolvedValueOnce(null);

      await expect(
        service.updateMe("64f000000000000000000003", { bio: "x" })
      ).rejects.toMatchObject({ code: ERR.USER.NOT_FOUND });
    });
  });

  describe("deleteMe", () => {
    it("borra cuando existe (resuelve void)", async () => {
      const id = "64f000000000000000000004";
      const deletedDoc = userDoc({ _id: id });
      M.findByIdAndDelete.mockResolvedValueOnce(deletedDoc);

      await expect(service.deleteMe(id)).resolves.toBeUndefined();
      expect(M.findByIdAndDelete).toHaveBeenCalledWith(id);
    });

    it("lanza NOT_FOUND si no existe", async () => {
      M.findByIdAndDelete.mockResolvedValueOnce(null);

      await expect(
        service.deleteMe("64f000000000000000000099")
      ).rejects.toMatchObject({ code: ERR.USER.NOT_FOUND });
    });

    it("propaga errores inesperados del modelo", async () => {
      const boom = new ApiError("boom", 400, ERR.COMMON.BAD_REQUEST);
      M.findByIdAndDelete.mockRejectedValueOnce(boom);
      await expect(service.deleteMe("64f000000000000000000010")).rejects.toBe(
        boom
      );
    });
  });
});
