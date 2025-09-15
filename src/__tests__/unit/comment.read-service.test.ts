import { Types } from "mongoose";
import * as service from "@read-models/comments/comment.read-service";
import type { PublicComment  } from "@modules/comments/comment.types"; 
import type { PublicCommentWithMeta } from "@read-models/comments/comment.read-types";

interface CommentModelLike {
  aggregate: jest.Mock<{ exec: jest.Mock<Promise<any[]>, []> }, [any[]]>;
}

jest.mock("@modules/comments/comment.model", () => ({
  Comment: {
    aggregate: jest.fn(),
  },
}));

jest.mock("@modules/comments/comment.types", () => ({
  toPublicComment: jest.fn((r: any) => ({
    id: String(r._id),
    postId: String(r.post),
    authorId: String(r.author),
    content: String(r.content ?? ""),
    createdAt: (r.createdAt ?? new Date()).toISOString(),
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
  }) satisfies PublicComment),
}));

const { Comment: M } = require("@modules/comments/comment.model") as {
  Comment: CommentModelLike;
};
const { toPublicComment } = require("@modules/comments/comment.types") as {
  toPublicComment: jest.Mock;
};

//Utils
afterEach(() => jest.clearAllMocks());

function aggRows(
  rows: Array<{
    _id?: string;
    post?: string;
    author?: string;
    content?: string;
    createdAt?: Date;
    updatedAt?: Date | undefined;
    likeCount?: number;
    likedByMe?: boolean;
  }>
) {
  const exec = jest.fn().mockResolvedValue(rows);
  (M.aggregate as jest.Mock).mockReturnValueOnce({ exec });
  return exec;
}

function makeRow(p: Partial<{
  _id: string; post: string; author: string; content: string;
  createdAt: Date; updatedAt: Date; likeCount: number; likedByMe: boolean;
}> = {}) {
  return {
    _id: p._id ?? new Types.ObjectId().toHexString(),
    post: p.post ?? new Types.ObjectId().toHexString(),
    author: p.author ?? new Types.ObjectId().toHexString(),
    content: p.content ?? "c",
    createdAt: p.createdAt ?? new Date("2025-09-04T10:00:00.000Z"),
    updatedAt: p.updatedAt,
    likeCount: p.likeCount ?? 0,
    likedByMe: p.likedByMe ?? false,
  };
}

// Tests
describe("read-models/comments → listByPostWithMeta", () => {
  it("devuelve DTOs con meta (likeCount, likedByMe) cuando userId existe", async () => {
    const postId = new Types.ObjectId().toHexString();
    const userId = new Types.ObjectId().toHexString();

    const r1 = makeRow({ post: postId, likeCount: 3, likedByMe: true });
    const r2 = makeRow({ post: postId, likeCount: 0, likedByMe: false });

    aggRows([r1, r2]);

    // Mock de DTO base para cada fila
    toPublicComment
      .mockReturnValueOnce({
        id: r1._id, postId, authorId: r1.author, content: r1.content, createdAt: r1.createdAt.toISOString(),
      } as PublicComment)
      .mockReturnValueOnce({
        id: r2._id, postId, authorId: r2.author, content: r2.content, createdAt: r2.createdAt.toISOString(),
      } as PublicComment);

    const out = await service.listByPostWithMeta(userId, postId, { page: 1, limit: 20 });

    // Pipeline cheeeeck
    const pipeline = (M.aggregate.mock.calls[0][0] as any[]);
    expect(pipeline[0].$match.post.toString()).toBe(postId);
    expect(pipeline[1]).toEqual({ $sort: { createdAt: -1 } });
    expect(pipeline[2]).toEqual({ $skip: 0 });
    expect(pipeline[3]).toEqual({ $limit: 20 });
    const hasLikesLookup = pipeline.some(s => s.$lookup && s.$lookup.pipeline?.some((p: any) =>
      p.$match?.$expr?.$and?.some((a: any) => Array.isArray(a.$eq) && a.$eq[1] === "$$cid")
    ));
    const hasLikedByMeLookup = pipeline.some(s => s.$lookup && s.$lookup.let?.uid);
    expect(hasLikesLookup).toBe(true);
    expect(hasLikedByMeLookup).toBe(true);

    // DTO + meta 
    expect(toPublicComment).toHaveBeenCalledTimes(2);
    expect(out).toEqual<PublicCommentWithMeta[]>([
      {
        id: r1._id,
        postId,
        authorId: r1.author,
        content: r1.content,
        createdAt: r1.createdAt.toISOString(),
        likedByMe: true,
        likeCount: 3,
      },
      {
        id: r2._id,
        postId,
        authorId: r2.author,
        content: r2.content,
        createdAt: r2.createdAt.toISOString(),
        likedByMe: false,
        likeCount: 0,
      },
    ]);
  });

  it("userId= null no lookup, likedByMe y likedByMe son false", async () => {
    const postId = new Types.ObjectId().toHexString();

    const r = makeRow({ post: postId, likeCount: 7, likedByMe: false });
    aggRows([r]);

    toPublicComment.mockReturnValueOnce({
      id: r._id, postId, authorId: r.author, content: r.content, createdAt: r.createdAt.toISOString(),
    } as PublicComment);

    const out = await service.listByPostWithMeta(null, postId);

    const pipeline = (M.aggregate.mock.calls[0][0] as any[]);
    const hasLikedByMeLookup = pipeline.some(s => s.$lookup && s.$lookup.let?.uid);
    const hasAddFieldsFalse = pipeline.some(s => s.$addFields && s.$addFields.likedByMe === false);

    expect(hasLikedByMeLookup).toBe(false);
    expect(hasAddFieldsFalse).toBe(true);

    expect(out[0]).toMatchObject<Partial<PublicCommentWithMeta>>({
      id: r._id,
      postId,
      likedByMe: false,
      likeCount: 7,
    });
  });

  it("clamps de paginación: page<1→1, limit>100→100; limit<1→1", async () => {
    const postId = new Types.ObjectId().toHexString();
    aggRows([]); 
    await service.listByPostWithMeta(null, postId, { page: -3, limit: 999 });
    let pipeline = (M.aggregate.mock.calls[0][0] as any[]);
    expect(pipeline[2]).toEqual({ $skip: 0 });
    expect(pipeline[3]).toEqual({ $limit: 100 });

    aggRows([]); 
    await service.listByPostWithMeta(null, postId, { page: 2, limit: 0 });
    pipeline = (M.aggregate.mock.calls[1][0] as any[]);
    expect(pipeline[2]).toEqual({ $skip: 1 }); 
    expect(pipeline[3]).toEqual({ $limit: 1 });
  });

  it("lanza si el postId no es un ObjectId válido (Types.ObjectId constructor)", async () => {
    await expect(
      service.listByPostWithMeta(null, "not-an-objectid")
    ).rejects.toBeTruthy(); 
    expect(M.aggregate).not.toHaveBeenCalled();
  });
});
