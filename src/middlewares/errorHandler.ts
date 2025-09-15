import { NextFunction, Request, Response } from "express";
import { ApiError } from "@shared/errors/apiError";
import { ZodError } from "zod";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
  return res.status(400).json({
    status: "error",
    message: "Validación inválida",
    code: "COMMON.BAD_REQUEST",
    details: err.issues,
  });
}

  if (err instanceof ApiError) {
    if (err.headers) {
      for (const [k, v] of Object.entries(err.headers)) {
        res.setHeader(k, v);
      }
    }

    const payload: Record<string, unknown> = {
      status: "error",
      message: err.message,
      code: err.code,
    };
    if (typeof err.details !== "undefined") {
      payload.details = err.details;
    }

    return res.status(err.statusCode).json(payload);
  }

  console.error("Unhandled Error:", err);

  return res.status(500).json({
    status: "error",
    message: "Unexpected server error",
    code: "UNHANDLED_ERROR",
  });
};
