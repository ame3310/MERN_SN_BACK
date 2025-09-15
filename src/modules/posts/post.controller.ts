import * as postService from "@modules/posts/post.service";
import {
  createPostSchema,
  updatePostSchema,
} from "@modules/posts/post.validations";
import { ApiError } from "@shared/errors/apiError";
import { NextFunction, Request, Response } from "express";

export async function createPost(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) throw ApiError.unauthorized();

    const { title, content, images } = createPostSchema.parse(req.body);
    const dto = await postService.createPost(user.id, {
      title,
      content,
      images,
    });
    res.status(201).json(dto);
  } catch (err) {
    next(err);
  }
}

export async function getPostById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const dto = await postService.getPostById(id);
    res.json(dto);
  } catch (err) {
    next(err);
  }
}

export async function updatePost(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) throw ApiError.unauthorized();

    const { id } = req.params;
    const patch = updatePostSchema.parse(req.body);

    const dto = await postService.updatePost(
      { id: user.id, role: user.role },
      id,
      patch
    );
    res.json(dto);
  } catch (err) {
    next(err);
  }
}

export async function deletePost(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) throw ApiError.unauthorized();

    const { id } = req.params;
    await postService.deletePost({ id: user.id, role: user.role }, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
