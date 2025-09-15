import { Comment } from "@modules/comments/comment.model";
import { Post } from "@modules/posts/post.model";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { assertValidObjectId } from "@utils/mongo";
import type { NextFunction, Request, Response } from "express";

export async function requireOwnerOrAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) return next(ApiError.unauthorized());

    let paramName: "userId" | "postId" | "commentId" | undefined;
    if (typeof req.params.userId === "string") paramName = "userId";
    else if (typeof req.params.postId === "string") paramName = "postId";
    else if (typeof req.params.commentId === "string") paramName = "commentId";

    if (!paramName) {
      return next(
        ApiError.badRequest(
          "Falta parámetro identificador en la ruta",
          ERR.COMMON.BAD_REQUEST
        )
      );
    }

    const id = req.params[paramName]!;
    assertValidObjectId(id, `ID de ${paramName.replace("Id", "")}`);

    const isAdmin = req.user.role === "admin";

    if (paramName === "userId") {
      if (!isAdmin && req.user.id !== id) {
        return next(ApiError.forbidden("No autorizado", ERR.COMMON.FORBIDDEN));
      }
      return next();
    }

    if (paramName === "postId") {
      const doc = await Post.findById(id).select("author").lean();
      if (!doc) {
        return next(
          ApiError.notFound("Post no encontrado", ERR.POST.NOT_FOUND)
        );
      }
      const ownerId = String(doc.author);
      if (!isAdmin && req.user.id !== ownerId) {
        return next(ApiError.forbidden("No autorizado", ERR.POST.NOT_OWNER));
      }
      return next();
    }

    if (paramName === "commentId") {
      const doc = await Comment.findById(id).select("author").lean();
      if (!doc) {
        return next(
          ApiError.notFound("Comentario no encontrado", ERR.COMMENT.NOT_FOUND)
        );
      }
      const ownerId = String(doc.author);
      if (!isAdmin && req.user.id !== ownerId) {
        return next(ApiError.forbidden("No autorizado", ERR.COMMENT.NOT_OWNER));
      }
      return next();
    }

    return next(
      ApiError.badRequest(
        "Tipo de recurso no soportado",
        ERR.COMMON.BAD_REQUEST
      )
    );
  } catch (err) {
    return next(err);
  }
}
