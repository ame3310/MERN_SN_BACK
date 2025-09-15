import * as sessionService from "@modules/sessions/session.service";
import { revokeSessionParamSchema } from "@modules/sessions/session.validations";
import { ApiError } from "@shared/errors/apiError";
import { NextFunction, Request, Response } from "express";

export async function listMySessions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    const data = await sessionService.listMySessions(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function revokeSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const requester = req.user;
    if (!requester) throw ApiError.unauthorized();

    const { sessionId } = revokeSessionParamSchema.parse(req.params);
    await sessionService.revokeSessionById(
      requester as Required<typeof requester>,
      sessionId
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function revokeAllMySessions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    await sessionService.revokeAllSessions(userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
