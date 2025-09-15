import { signOne } from "@modules/uploads/upload.service";
import {
  signBatchBodySchema,
  signQuerySchema,
} from "@modules/uploads/upload.validations";
import { NextFunction, Request, Response } from "express";

export async function getSignedFields(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id; 
    const { kind } = signQuerySchema.parse(req.query);
    const signed = signOne(userId, kind);
    res.json(signed);
  } catch (err) {
    next(err);
  }
}

export async function getSignedBatch(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id;
    const { kind, count } = signBatchBodySchema.parse(req.body);
    const items = Array.from({ length: count }, () => signOne(userId, kind));
    res.json({ items });
  } catch (err) {
    next(err);
  }
}
