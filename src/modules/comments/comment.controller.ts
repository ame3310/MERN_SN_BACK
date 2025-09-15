import { Comment } from "@modules/comments/comment.model";
import * as commentService from "@modules/comments/comment.service";
import { ApiError } from "@shared/errors/apiError";
import { NextFunction, Request, Response } from "express";
import {
  commentIdParamSchema,
  createCommentSchema,
  updateCommentSchema,
} from "./comment.validations";

export async function createComment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    const { postId, content } = createCommentSchema.parse(req.body);
    const dto = await commentService.createComment(userId, { postId, content });
    const populated = await Comment.findById(dto.id)
      .populate({ path: "author", select: "username avatarUrl" })
      .lean();

    res.status(201).json({
      ...dto,
      author: populated?.author
        ? {
            id: String((populated.author as any)._id),
            username: (populated.author as any).username,
            avatarUrl:
              ((populated.author as any).avatarUrl as string | null) ?? null,
          }
        : undefined,
      likeCount: 0,
      likedByMe: false,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCommentById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { commentId } = commentIdParamSchema.parse(req.params);
    const dto = await commentService.getCommentById(commentId);
    res.json(dto);
  } catch (err) {
    next(err);
  }
}

export async function updateComment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();
    const { commentId } = commentIdParamSchema.parse(req.params);
    const { content } = updateCommentSchema.parse(req.body);
    const dto = await commentService.updateComment(commentId, userId, {
      content,
    });
    const populated = await Comment.findById(dto.id)
      .populate({ path: "author", select: "username avatarUrl" })
      .lean();

    res.json({
      ...dto,
      author: populated?.author
        ? {
            id: String((populated.author as any)._id),
            username: (populated.author as any).username,
            avatarUrl:
              ((populated.author as any).avatarUrl as string | null) ?? null,
          }
        : undefined,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    const { commentId } = commentIdParamSchema.parse(req.params);
    const isAdmin = req.user?.role === "admin";

    await commentService.deleteComment(commentId, userId, isAdmin);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
