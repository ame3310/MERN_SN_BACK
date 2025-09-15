import type { PublicComment } from "@modules/comments/comment.types";

export type PublicCommentWithMeta = PublicComment & {
  likeCount: number;
  likedByMe: boolean;
};
