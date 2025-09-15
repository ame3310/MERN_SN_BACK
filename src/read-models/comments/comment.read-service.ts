import { Comment } from "@modules/comments/comment.model";
import type { PublicCommentWithMeta } from "@read-models/comments/comment.read-types";
import { PipelineStage, Types } from "mongoose";

type Row = {
  _id: Types.ObjectId;
  post: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likeCount?: number;
  likedByMe?: boolean;
  authorDoc?: {
    _id: Types.ObjectId;
    username: string;
    avatarUrl?: string | null;
  };
};

export async function listByPostWithMeta(
  userId: string | null,
  postId: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
): Promise<{
  data: PublicCommentWithMeta[];
  page: number;
  limit: number;
  total: number;
}> {
  const cid = new Types.ObjectId(postId);
  const uid = userId ? new Types.ObjectId(userId) : null;

  const _page = Math.max(1, page);
  const _limit = Math.min(100, Math.max(1, limit));
  const skip = (_page - 1) * _limit;

  const pipeline: PipelineStage[] = [
    { $match: { post: cid } },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: _limit },

    {
      $lookup: {
        from: "likes",
        let: { cid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$targetId", "$$cid"] },
                  { $eq: ["$targetType", "comment"] },
                ],
              },
            },
          },
          { $count: "count" },
        ],
        as: "likesAgg",
      },
    },
    {
      $addFields: {
        likeCount: { $ifNull: [{ $first: "$likesAgg.count" }, 0] },
      },
    },

    ...(uid
      ? ([
          {
            $lookup: {
              from: "likes",
              let: { cid: "$_id", uid },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$targetId", "$$cid"] },
                        { $eq: ["$targetType", "comment"] },
                        { $eq: ["$user", "$$uid"] },
                      ],
                    },
                  },
                },
                { $limit: 1 },
              ],
              as: "likedByMeAgg",
            },
          },
          {
            $addFields: { likedByMe: { $gt: [{ $size: "$likedByMeAgg" }, 0] } },
          },
        ] as PipelineStage[])
      : ([{ $addFields: { likedByMe: false } }] as PipelineStage[])),

    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        pipeline: [{ $project: { username: 1, avatarUrl: 1 } }],
        as: "authorDoc",
      },
    },
    { $addFields: { authorDoc: { $first: "$authorDoc" } } },

    {
      $project: {
        _id: 1,
        post: 1,
        author: 1,
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        likeCount: 1,
        likedByMe: 1,
        "authorDoc._id": 1,
        "authorDoc.username": 1,
        "authorDoc.avatarUrl": 1,
      },
    },
  ];

  const [rows, total] = await Promise.all([
    Comment.aggregate<Row>(pipeline).exec(),
    Comment.countDocuments({ post: cid }),
  ]);

  const data: PublicCommentWithMeta[] = rows.map((r) => ({
    id: String(r._id),
    postId: String(r.post),
    authorId: String(r.author),
    author: r.authorDoc
      ? {
          id: String(r.authorDoc._id),
          username: r.authorDoc.username,
          avatarUrl: r.authorDoc.avatarUrl ?? null,
        }
      : undefined,
    content: r.content,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt),
    updatedAt:
      r.updatedAt instanceof Date
        ? r.updatedAt.toISOString()
        : String(r.updatedAt),
    likeCount: r.likeCount ?? 0,
    likedByMe: Boolean(r.likedByMe),
  }));

  return { data, page: _page, limit: _limit, total };
}
