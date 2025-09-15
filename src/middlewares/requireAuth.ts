import { Request, Response, NextFunction } from "express";
import { extractUserFromAuthHeader } from "@utils/auth";

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    req.user = extractUserFromAuthHeader(req);
    next();
  } catch (err) {
    next(err);
  }
};
