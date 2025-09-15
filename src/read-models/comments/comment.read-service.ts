import { Comment } from "@modules/comments/comment.model";
import { toPublicComment } from "@modules/comments/comment.types";
import type { PublicCommentWithMeta } from "@read-models/comments/comment.read-types";
import { Types } from "mongoose";

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

  const pipeline: any[] = [
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
      ? [
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
        ]
      : [{ $addFields: { likedByMe: false } }]),

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
        post: 1,
        author: 1,
        authorDoc: 1,
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        likeCount: 1,
        likedByMe: 1,
      },
    },
  ];

  const [rows, total] = await Promise.all([
    Comment.aggregate(pipeline).exec(),
    Comment.countDocuments({ post: cid }),
  ]);

  const data: PublicCommentWithMeta[] = rows.map((r: any) => {
    const base = toPublicComment(r as any);
    const author =
      r.authorDoc && r.author
        ? {
            id: String(r.author),
            username: r.authorDoc.username as string,
            avatarUrl: (r.authorDoc.avatarUrl as string | null) ?? null,
          }
        : undefined;

    return {
      ...base,
      author,
      likeCount: r.likeCount ?? 0,
      likedByMe: !!r.likedByMe,
    };
  });

  return { data, page: _page, limit: _limit, total };
}
