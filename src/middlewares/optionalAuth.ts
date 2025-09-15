import { tryExtractUser } from "@utils/auth";
import { NextFunction, Request, Response } from "express";

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = tryExtractUser(req);
    if (user) req.user = user;
  } catch {
    req.user = null;
  }
  next();
}
