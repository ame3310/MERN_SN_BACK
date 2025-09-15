export type PublicCommentBase = {
  id: string;
  postId: string;
  authorId: string;
  author?: { id: string; username: string; avatarUrl?: string | null };
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicCommentWithMeta = PublicCommentBase & {
  likeCount: number;
  likedByMe: boolean;
};
