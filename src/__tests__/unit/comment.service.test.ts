import * as service from "@modules/comments/comment.service";
import type { PublicComment } from "@modules/comments/comment.types";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { Types } from "mongoose";

interface CommentModelLike {
  create: jest.Mock;
  find: jest.Mock;
  findById: jest.Mock;
}
interface PostModelLike {
  exists: jest.Mock;
}

jest.mock("@modules/comments/comment.model", () => ({
  Comment: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock("@modules/posts/post.model", () => ({
  Post: {
    exists: jest.fn(),
  },
}));

jest.mock("@modules/comments/comment.types", () => ({
  toPublicComment: jest.fn(
    (doc: any) =>
      ({
        id: String(doc._id),
        postId: String(doc.post),
        authorId: String(doc.author),
        content: String(doc.content ?? ""),
        createdAt: (doc.createdAt ?? new Date()).toISOString(),
        updatedAt: doc.updatedAt
          ? new Date(doc.updatedAt).toISOString()
          : undefined,
      } satisfies PublicComment)
  ),
}));

const { Comment: M } = require("@modules/comments/comment.model") as {
  Comment: CommentModelLike;
};
const { Post: P } = require("@modules/posts/post.model") as {
  Post: PostModelLike;
};
const { toPublicComment: toPublic } =
  require("@modules/comments/comment.types") as {
    toPublicComment: jest.Mock;
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

function commentDoc(
  p: Partial<{
    _id: string;
    post: string;
    author: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    save: jest.Mock;
    deleteOne: jest.Mock;
  }> = {}
) {
  return {
    _id: p._id ?? new Types.ObjectId().toHexString(),
    post: p.post ?? new Types.ObjectId().toHexString(),
    author: p.author ?? new Types.ObjectId().toHexString(),
    content: p.content ?? "hi",
    createdAt: p.createdAt ?? now,
    updatedAt: p.updatedAt ?? now,
    save: p.save ?? jest.fn().mockResolvedValue(undefined),
    deleteOne: p.deleteOne ?? jest.fn().mockResolvedValue(undefined),
  };
}

describe("comment.service", () => {
  describe("createComment", () => {
    it("crea un comentario si el post existe y devuelve el DTO", async () => {
      const userId = new Types.ObjectId().toHexString();
      const postId = new Types.ObjectId().toHexString();
      P.exists.mockResolvedValueOnce({ _id: postId });

      const created = commentDoc({
        author: userId,
        post: postId,
        content: "hola",
      });
      M.create.mockResolvedValueOnce(created);

      toPublic.mockReturnValueOnce({
        id: created._id,
        postId,
        authorId: userId,
        content: "hola",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      } as PublicComment);

      const out = await service.createComment(userId, {
        postId,
        content: "hola",
      });

      expect(P.exists).toHaveBeenCalledWith({ _id: postId });
      expect(M.create).toHaveBeenCalledWith({
        post: postId,
        author: userId,
        content: "hola",
      });
      expect(toPublic).toHaveBeenCalledWith(created);
      expect(out).toMatchObject({
        id: created._id,
        postId,
        authorId: userId,
        content: "hola",
      });
    });

    it("lanza Unauthorized si falta userId", async () => {
      const postId = new Types.ObjectId().toHexString();
      await expect(
        // @ts-expect-error probamos no userId 
        service.createComment(undefined, { postId, content: "x" })
      ).rejects.toBeInstanceOf(ApiError);
      expect(P.exists).not.toHaveBeenCalled();
      expect(M.create).not.toHaveBeenCalled();
    });

    it("lanza BAD_REQUEST si userId no es ObjectId", async () => {
      const postId = new Types.ObjectId().toHexString();
      await expect(
        service.createComment("bad", { postId, content: "x" })
      ).rejects.toMatchObject({ code: ERR.COMMON.BAD_REQUEST });
      expect(P.exists).not.toHaveBeenCalled();
    });

    it("lanza NOT_FOUND si el post no existe", async () => {
      const userId = new Types.ObjectId().toHexString();
      const postId = new Types.ObjectId().toHexString();
      P.exists.mockResolvedValueOnce(null);

      await expect(
        service.createComment(userId, { postId, content: "hola" })
      ).rejects.toMatchObject({ code: ERR.POST.NOT_FOUND });
      expect(M.create).not.toHaveBeenCalled();
    });
  });

  describe("listCommentsByPost", () => {
    function chainFor(
      docs: any[],
      capture: { sort?: any; skip?: any; limit?: any } = {}
    ) {
      const limit = jest.fn().mockImplementationOnce((n: number) => {
        capture.limit = n;
        return Promise.resolve(docs);
      });
      const skip = jest.fn().mockImplementationOnce((n: number) => {
        capture.skip = n;
        return { limit };
      });
      const sort = jest.fn().mockImplementationOnce((s: any) => {
        capture.sort = s;
        return { skip, limit };
      });
      M.find.mockReturnValueOnce({ sort, skip, limit });
      return { sort, skip, limit };
    }

    it("lista comentarios paginados y ordenados (por defecto page=1, limit=20)", async () => {
      const postId = new Types.ObjectId().toHexString();
      P.exists.mockResolvedValueOnce({ _id: postId });

      const docs = [commentDoc({ post: postId }), commentDoc({ post: postId })];
      const capture: any = {};
      chainFor(docs, capture);

      const dto1: PublicComment = {
        id: "1",
        postId,
        authorId: "a",
        content: "x",
        createdAt: now.toISOString(),
      };
      const dto2: PublicComment = {
        id: "2",
        postId,
        authorId: "b",
        content: "y",
        createdAt: now.toISOString(),
      };
      toPublic.mockReturnValueOnce(dto1).mockReturnValueOnce(dto2);

      const out = await service.listCommentsByPost(postId);

      expect(P.exists).toHaveBeenCalledWith({ _id: postId });
      expect(M.find).toHaveBeenCalledWith({ post: postId });
      expect(capture.sort).toEqual({ createdAt: -1 });
      expect(capture.skip).toBe(0);
      expect(capture.limit).toBe(20);
      expect(toPublic).toHaveBeenCalledTimes(2);
      expect(out).toEqual([dto1, dto2]);
    });

    it("aplica clamps: page<1 → 1; limit>100 → 100; limit<1 → 1; y calcula skip", async () => {
      const postId = new Types.ObjectId().toHexString();
      P.exists.mockResolvedValue(true);

      {
        const capture: any = {};
        chainFor([], capture);
        await service.listCommentsByPost(postId, { page: -5, limit: 999 });
        expect(capture.skip).toBe(0);
        expect(capture.limit).toBe(100);
      }

      {
        const capture: any = {};
        chainFor([], capture);
        await service.listCommentsByPost(postId, { page: 1, limit: 0 });
        expect(capture.skip).toBe(0);
        expect(capture.limit).toBe(1);
      }

      {
        const capture: any = {};
        chainFor([], capture);
        await service.listCommentsByPost(postId, { page: 3, limit: 5 });
        expect(capture.skip).toBe(10);
        expect(capture.limit).toBe(5);
      }
    });

    it("errores: BAD_REQUEST postId inválido, NOT_FOUND si no existe", async () => {
      await expect(service.listCommentsByPost("bad")).rejects.toMatchObject({
        code: ERR.COMMON.BAD_REQUEST,
      });

      const postId = new Types.ObjectId().toHexString();
      P.exists.mockResolvedValueOnce(null);
      await expect(service.listCommentsByPost(postId)).rejects.toMatchObject({
        code: ERR.POST.NOT_FOUND,
      });
    });
  });

  describe("getCommentById", () => {
    it("devuelve DTO si existe", async () => {
      const cid = new Types.ObjectId().toHexString();
      const doc = commentDoc({ _id: cid });
      M.findById.mockResolvedValueOnce(doc);

      const dto: PublicComment = {
        id: cid,
        postId: doc.post,
        authorId: doc.author,
        content: "x",
        createdAt: now.toISOString(),
      };
      toPublic.mockReturnValueOnce(dto);

      const out = await service.getCommentById(cid);

      expect(M.findById).toHaveBeenCalledWith(cid);
      expect(toPublic).toHaveBeenCalledWith(doc);
      expect(out).toEqual(dto);
    });

    it("errores: BAD_REQUEST si id inválido; NOT_FOUND si no existe", async () => {
      await expect(service.getCommentById("bad")).rejects.toMatchObject({
        code: ERR.COMMON.BAD_REQUEST,
      });

      const cid = new Types.ObjectId().toHexString();
      M.findById.mockResolvedValueOnce(null);
      await expect(service.getCommentById(cid)).rejects.toMatchObject({
        code: ERR.COMMENT.NOT_FOUND,
      });
    });
  });

  describe("updateComment", () => {
    it("actualiza contenido si es el dueño", async () => {
      const cid = new Types.ObjectId().toHexString();
      const owner = new Types.ObjectId().toHexString();

      const doc = commentDoc({ _id: cid, author: owner, content: "old" });
      M.findById.mockResolvedValueOnce(doc);

      const dto: PublicComment = {
        id: cid,
        postId: doc.post,
        authorId: owner,
        content: "new",
        createdAt: now.toISOString(),
      };
      toPublic.mockReturnValueOnce(dto);

      const out = await service.updateComment(cid, owner, { content: "new" });

      expect(M.findById).toHaveBeenCalledWith(cid);
      expect(doc.save).toHaveBeenCalled();
      expect(doc.content).toBe("new");
      expect(out).toEqual(dto);
    });

    it("acepta author como ObjectId real (doc.author.toString())", async () => {
      const cid = new Types.ObjectId().toHexString();
      const ownerObj = new Types.ObjectId();
      const owner = ownerObj.toHexString();

      const doc = commentDoc({
        _id: cid,
        author: ownerObj as any,
        content: "old",
      });
      M.findById.mockResolvedValueOnce(doc);

      toPublic.mockReturnValueOnce({
        id: cid,
        postId: doc.post,
        authorId: owner,
        content: "zzz",
        createdAt: now.toISOString(),
      } as PublicComment);

      await service.updateComment(cid, owner, { content: "zzz" });

      expect(doc.save).toHaveBeenCalled();
      expect(doc.content).toBe("zzz");
    });

    it("errores: BAD_REQUEST ids inválidos; NOT_FOUND si no existe; FORBIDDEN si no es dueño", async () => {
      await expect(
        service.updateComment("bad", "also-bad", { content: "x" })
      ).rejects.toMatchObject({ code: ERR.COMMON.BAD_REQUEST });

      const cid = new Types.ObjectId().toHexString();
      const uid = new Types.ObjectId().toHexString();
      M.findById.mockResolvedValueOnce(null);
      await expect(
        service.updateComment(cid, uid, { content: "x" })
      ).rejects.toMatchObject({ code: ERR.COMMENT.NOT_FOUND });

      // no owner
      const owner = new Types.ObjectId().toHexString();
      const stranger = new Types.ObjectId().toHexString();
      const doc = commentDoc({ _id: cid, author: owner, content: "old" });
      M.findById.mockResolvedValueOnce(doc);
      await expect(
        service.updateComment(cid, stranger, { content: "new" })
      ).rejects.toMatchObject({ code: ERR.COMMENT.NOT_OWNER });
      expect(doc.save).not.toHaveBeenCalled();
    });
  });

  describe("deleteComment", () => {
    it("borra si es dueño", async () => {
      const cid = new Types.ObjectId().toHexString();
      const owner = new Types.ObjectId().toHexString();
      const doc = commentDoc({ _id: cid, author: owner });
      M.findById.mockResolvedValueOnce(doc);

      await service.deleteComment(cid, owner, false);

      expect(M.findById).toHaveBeenCalledWith(cid);
      expect(doc.deleteOne).toHaveBeenCalled();
    });

    it("borra si es admin aunque no sea dueño", async () => {
      const cid = new Types.ObjectId().toHexString();
      const owner = new Types.ObjectId().toHexString();
      const other = new Types.ObjectId().toHexString();
      const doc = commentDoc({ _id: cid, author: owner });
      M.findById.mockResolvedValueOnce(doc);

      await service.deleteComment(cid, other, true);

      expect(doc.deleteOne).toHaveBeenCalled();
    });

    it("FORBIDDEN si no es dueño ni admin", async () => {
      const cid = new Types.ObjectId().toHexString();
      const owner = new Types.ObjectId().toHexString();
      const other = new Types.ObjectId().toHexString();
      const doc = commentDoc({ _id: cid, author: owner });
      M.findById.mockResolvedValueOnce(doc);

      await expect(
        service.deleteComment(cid, other, false)
      ).rejects.toMatchObject({
        code: ERR.COMMENT.NOT_OWNER,
      });
      expect(doc.deleteOne).not.toHaveBeenCalled();
    });

    it("errores: BAD_REQUEST ids inválidos; NOT_FOUND si no existe", async () => {
      await expect(
        service.deleteComment("bad", "also-bad", false)
      ).rejects.toMatchObject({ code: ERR.COMMON.BAD_REQUEST });

      const cid = new Types.ObjectId().toHexString();
      const uid = new Types.ObjectId().toHexString();
      M.findById.mockResolvedValueOnce(null);

      await expect(
        service.deleteComment(cid, uid, false)
      ).rejects.toMatchObject({
        code: ERR.COMMENT.NOT_FOUND,
      });
    });
  });
});
