import * as service from "@modules/sessions/session.service";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { Types } from "mongoose";

type FindSelectReturn = { select: jest.Mock<Promise<any[]>, [string]> };
type FindSortReturn = {
  sort: jest.Mock<Promise<any[]>, [Record<string, 1 | -1>]>;
};
type FindReturn = FindSelectReturn | FindSortReturn;

interface SessionModelLike {
  create: jest.Mock<Promise<any>, [any]>;
  find: jest.Mock<FindReturn, [any]>;
  findById: jest.Mock<Promise<any>, [string]>;
  findByIdAndUpdate: jest.Mock<Promise<any>, [string, any]>;
  updateMany: jest.Mock<Promise<any>, [any, any]>;
}

jest.mock("@modules/sessions/session.model", () => ({
  Session: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock("@shared/security/crypto", () => ({
  sha256Hex: jest.fn((s: string) => `sha(${s})`),
  safeEqualHex: jest.fn((a: string, b: string) => a === b),
}));

jest.mock("@modules/sessions/session.types", () => ({
  toPublicSession: jest.fn((doc: any) => ({
    id: String(doc._id),
    userId: String(doc.user),
    userAgent: doc.userAgent,
    ip: doc.ip,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    lastUsedAt: doc.lastUsedAt
      ? new Date(doc.lastUsedAt).toISOString()
      : undefined,
    revokedAt: doc.revokedAt ? new Date(doc.revokedAt).toISOString() : null,
    active: !doc.revokedAt,
  })),
}));

const { Session: M } = require("@modules/sessions/session.model") as {
  Session: SessionModelLike;
};
const { toPublicSession: toPublic } =
  require("@modules/sessions/session.types") as {
    toPublicSession: jest.Mock;
  };
const { sha256Hex: sha, safeEqualHex: safe } =
  require("@shared/security/crypto") as {
    sha256Hex: jest.Mock;
    safeEqualHex: jest.Mock;
  };

const now = new Date("2025-09-04T10:00:00.000Z");

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(now);
});

afterAll(() => {
  jest.useRealTimers();
});

afterEach(() => {
  jest.clearAllMocks();
});

function makeDoc(
  p: Partial<{
    _id: string;
    user: string;
    refreshTokenHash: string;
    revokedAt: Date | null;
    lastUsedAt: Date | null;
    userAgent: string;
    ip: string;
    createdAt: Date;
  }> = {}
) {
  return {
    _id: p._id ?? new Types.ObjectId().toHexString(),
    user: p.user ?? new Types.ObjectId().toHexString(),
    refreshTokenHash: p.refreshTokenHash ?? "sha(rt)",
    revokedAt: typeof p.revokedAt === "undefined" ? null : p.revokedAt,
    lastUsedAt: typeof p.lastUsedAt === "undefined" ? null : p.lastUsedAt,
    userAgent: p.userAgent,
    ip: p.ip,
    createdAt: p.createdAt ?? now,
  };
}

describe("session.service", () => {
  describe("createSession", () => {
    it("crea la sesión con hash del refresh y devuelve el DTO público", async () => {
      const userId = new Types.ObjectId().toHexString();
      const refresh = "rt-123";
      const created = makeDoc({
        user: userId,
        refreshTokenHash: `sha(${refresh})`,
        userAgent: "UA",
        ip: "1.2.3.4",
      });

      M.create.mockResolvedValueOnce(created);
      toPublic.mockReturnValueOnce({
        id: created._id,
        userId,
        userAgent: "UA",
        ip: "1.2.3.4",
        createdAt: now.toISOString(),
        revokedAt: null,
        active: true,
      });

      const out = await service.createSession(userId, refresh, {
        userAgent: "UA",
        ip: "1.2.3.4",
      });

      expect(sha).toHaveBeenCalledWith(refresh);
      expect(M.create).toHaveBeenCalledWith({
        user: userId,
        refreshTokenHash: `sha(${refresh})`,
        userAgent: "UA",
        ip: "1.2.3.4",
      });
      expect(toPublic).toHaveBeenCalledWith(created);
      expect(out).toMatchObject({
        id: created._id,
        userId,
        userAgent: "UA",
        ip: "1.2.3.4",
        createdAt: now.toISOString(),
        revokedAt: null,
        active: true,
      });
    });

    it("lanza BAD_REQUEST si el userId es inválido", async () => {
      await expect(service.createSession("bad-id", "rt")).rejects.toMatchObject(
        { code: ERR.COMMON.BAD_REQUEST }
      );
    });
  });

  describe("findActiveSessionByRefresh", () => {
    it("busca activas por user, compara hashes; si coincide, carga la sesión completa", async () => {
      const userId = new Types.ObjectId().toHexString();
      const rt = "needle";
      const id1 = new Types.ObjectId().toHexString();
      const id2 = new Types.ObjectId().toHexString();

      const selectMock = jest.fn().mockResolvedValueOnce([
        { _id: id1, refreshTokenHash: "sha(other)" },
        { _id: id2, refreshTokenHash: `sha(${rt})` },
      ]);
      M.find.mockReturnValueOnce({ select: selectMock });

      const full = makeDoc({
        _id: id2,
        user: userId,
        refreshTokenHash: `sha(${rt})`,
      });
      M.findById.mockResolvedValueOnce(full);

      const found = await service.findActiveSessionByRefresh(userId, rt);

      expect(sha).toHaveBeenCalledWith(rt);
      expect(M.find).toHaveBeenCalledWith({ user: userId, revokedAt: null });
      expect(selectMock).toHaveBeenCalledWith("_id refreshTokenHash");
      expect(safe).toHaveBeenCalled();
      expect(M.findById).toHaveBeenCalledWith(id2);
      expect(found).toEqual(full);
    });

    it("devuelve null si no hay coincidencia", async () => {
      const userId = new Types.ObjectId().toHexString();
      const selectMock = jest.fn().mockResolvedValueOnce([
        { _id: "a", refreshTokenHash: "sha(x)" },
        { _id: "b", refreshTokenHash: "sha(y)" },
      ]);
      M.find.mockReturnValueOnce({ select: selectMock });

      const res = await service.findActiveSessionByRefresh(userId, "needle");
      expect(res).toBeNull();
      expect(M.findById).not.toHaveBeenCalled();
    });

    it("lanza BAD_REQUEST si el userId es inválido", async () => {
      await expect(
        service.findActiveSessionByRefresh("bad", "rt")
      ).rejects.toMatchObject({ code: ERR.COMMON.BAD_REQUEST });
    });
  });

  describe("touchSession", () => {
    it("actualiza lastUsedAt a ahora()", async () => {
      const sid = new Types.ObjectId().toHexString();
      M.findByIdAndUpdate.mockResolvedValueOnce(undefined);

      await service.touchSession(sid);

      expect(M.findByIdAndUpdate).toHaveBeenCalledWith(sid, {
        lastUsedAt: now,
      });
    });

    it("lanza BAD_REQUEST si el sessionId es inválido", async () => {
      await expect(service.touchSession("bad")).rejects.toMatchObject({
        code: ERR.COMMON.BAD_REQUEST,
      });
    });
  });

  describe("rotateSession", () => {
    it("revoca la sesión antigua y crea una nueva con el nuevo refresh", async () => {
      const oldId = new Types.ObjectId().toHexString();
      const userId = new Types.ObjectId().toHexString();
      const meta = { userAgent: "UA", ip: "9.9.9.9" };

      M.findByIdAndUpdate.mockResolvedValueOnce(undefined);

      const created = makeDoc({
        user: userId,
        refreshTokenHash: "sha(rt-new)",
        userAgent: meta.userAgent,
        ip: meta.ip,
      });
      M.create.mockResolvedValueOnce(created);

      // DTO final
      toPublic.mockReturnValueOnce({
        id: created._id,
        userId,
        userAgent: meta.userAgent,
        ip: meta.ip,
        createdAt: now.toISOString(),
        revokedAt: null,
        active: true,
      });

      const out = await service.rotateSession(oldId, userId, "rt-new", meta);

      expect(M.findByIdAndUpdate).toHaveBeenCalledWith(oldId, {
        revokedAt: now,
      });
      expect(sha).toHaveBeenCalledWith("rt-new");
      expect(M.create).toHaveBeenCalledWith({
        user: userId,
        refreshTokenHash: "sha(rt-new)",
        userAgent: "UA",
        ip: "9.9.9.9",
      });
      expect(out).toMatchObject({
        id: created._id,
        userId,
        userAgent: "UA",
        ip: "9.9.9.9",
        createdAt: now.toISOString(),
        revokedAt: null,
        active: true,
      });
    });

    it("valida IDs (sesión y usuario)", async () => {
      await expect(
        service.rotateSession("bad", "also-bad", "rt")
      ).rejects.toMatchObject({ code: ERR.COMMON.BAD_REQUEST });
    });
  });

  describe("revokeAllSessions", () => {
    it("marca revokedAt = ahora() para todas las activas del usuario", async () => {
      const userId = new Types.ObjectId().toHexString();
      M.updateMany.mockResolvedValueOnce({
        acknowledged: true,
        modifiedCount: 5,
      });

      await service.revokeAllSessions(userId);

      expect(M.updateMany).toHaveBeenCalledWith(
        { user: userId, revokedAt: null },
        { revokedAt: now }
      );
    });

    it("valida userId", async () => {
      await expect(service.revokeAllSessions("bad")).rejects.toMatchObject({
        code: ERR.COMMON.BAD_REQUEST,
      });
    });
  });

  describe("revokeSessionById", () => {
    it("404 si la sesión no existe", async () => {
      const sid = new Types.ObjectId().toHexString();
      M.findById.mockResolvedValueOnce(null);

      await expect(
        service.revokeSessionById(
          { id: new Types.ObjectId().toHexString(), role: "user" },
          sid
        )
      ).rejects.toBeInstanceOf(ApiError);

      await expect(
        service.revokeSessionById({ id: "x", role: "user" }, sid)
      ).rejects.toMatchObject({ code: ERR.AUTH.SESSION_NOT_FOUND });
    });

    it("FORBIDDEN si no es dueñ@ ni admin", async () => {
      const owner = new Types.ObjectId().toHexString();
      const other = new Types.ObjectId().toHexString();
      const sid = new Types.ObjectId().toHexString();
      M.findById.mockResolvedValueOnce(
        makeDoc({ _id: sid, user: owner, revokedAt: null })
      );

      await expect(
        service.revokeSessionById({ id: other, role: "user" }, sid)
      ).rejects.toMatchObject({ code: ERR.COMMON.FORBIDDEN });

      expect(M.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("no hace nada si ya estaba revocada", async () => {
      const owner = new Types.ObjectId().toHexString();
      const sid = new Types.ObjectId().toHexString();
      M.findById.mockResolvedValueOnce(
        makeDoc({ _id: sid, user: owner, revokedAt: now })
      );

      await service.revokeSessionById({ id: owner, role: "user" }, sid);

      expect(M.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("revoca si es dueñ@ o admin", async () => {
      const owner = new Types.ObjectId().toHexString();
      const sid = new Types.ObjectId().toHexString();
      M.findById.mockResolvedValueOnce(
        makeDoc({ _id: sid, user: owner, revokedAt: null })
      );

      await service.revokeSessionById({ id: owner, role: "user" }, sid);
      expect(M.findByIdAndUpdate).toHaveBeenCalledWith(sid, { revokedAt: now });

      jest.clearAllMocks();
      M.findById.mockResolvedValueOnce(
        makeDoc({ _id: sid, user: owner, revokedAt: null })
      );
      await service.revokeSessionById(
        { id: new Types.ObjectId().toHexString(), role: "admin" },
        sid
      );
      expect(M.findByIdAndUpdate).toHaveBeenCalledWith(sid, { revokedAt: now });
    });

    it("valida sessionId", async () => {
      await expect(
        service.revokeSessionById({ id: "x", role: "user" }, "bad")
      ).rejects.toMatchObject({ code: ERR.COMMON.BAD_REQUEST });
    });
  });

  describe("listMySessions", () => {
    it("devuelve DTOs ordenados por (revokedAt asc, lastUsedAt desc, createdAt desc)", async () => {
      const userId = new Types.ObjectId().toHexString();

      const docs = [
        makeDoc({
          _id: "1",
          user: userId,
          revokedAt: null,
          lastUsedAt: new Date("2025-09-04T09:59:00Z"),
        }),
        makeDoc({ _id: "2", user: userId, revokedAt: now, lastUsedAt: null }),
      ];

      const sortMock = jest.fn().mockResolvedValueOnce(docs);
      M.find.mockReturnValueOnce({ sort: sortMock });

      toPublic
        .mockReturnValueOnce({
          id: "1",
          userId,
          createdAt: now.toISOString(),
          lastUsedAt: new Date("2025-09-04T09:59:00.000Z").toISOString(),
          revokedAt: null,
          active: true,
        })
        .mockReturnValueOnce({
          id: "2",
          userId,
          createdAt: now.toISOString(),
          revokedAt: now.toISOString(),
          active: false,
        });

      const res = await service.listMySessions(userId);

      expect(M.find).toHaveBeenCalledWith({ user: userId });
      expect(sortMock).toHaveBeenCalledWith({
        revokedAt: 1,
        lastUsedAt: -1,
        createdAt: -1,
      });
      expect(toPublic).toHaveBeenCalledTimes(2);
      expect(res).toHaveLength(2);
      expect(res[0]).toMatchObject({
        id: "1",
        userId,
        revokedAt: null,
        active: true,
      });
      expect(res[1]).toMatchObject({
        id: "2",
        userId,
        revokedAt: now.toISOString(),
        active: false,
      });
    });

    it("valida userId", async () => {
      await expect(service.listMySessions("bad")).rejects.toMatchObject({
        code: ERR.COMMON.BAD_REQUEST,
      });
    });
  });
});
