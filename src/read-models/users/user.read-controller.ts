import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as userRead from "./user.read-service";

const idParam = z.object({ id: z.string().trim().min(1) });

const listQuery = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const availabilityQuery = z.object({
  username: z.string().trim().min(1, "username requerido"),
});

export async function getUserProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const viewerId = req.user?.id;
    const { id } = idParam.parse(req.params);

    const dto = await userRead.getUserPublicProfile(id, viewerId);
    res.json(dto);
  } catch (err) {
    next(err);
  }
}

export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { q, page, limit } = listQuery.parse(req.query);
    const result = await userRead.listUsers({ q, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUsernameAvailability(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { username } = availabilityQuery.parse(req.query);
    const result = await userRead.isUsernameAvailable(username);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

const idOrUsernameParam = z.object({
  idOrUsername: z.string().trim().min(1),
});

export async function getUserProfileSmart(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const viewerId = req.user?.id;
    const { idOrUsername } = idOrUsernameParam.parse(req.params);
    const dto = await userRead.getUserPublicProfileSmart(idOrUsername, viewerId);
    res.json(dto);
  } catch (err) {
    next(err);
  }
}
