import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { verifyAccessToken, type AccessJwtPayload } from "@utils/jwt";
import type { Request } from "express";

export function extractUserFromAuthHeader(req: Request) {
  const authHeader = req.header("authorization") ?? req.header("Authorization");
  if (!authHeader) {
    throw ApiError.unauthorized(
      "Token no proporcionado",
      ERR.AUTH.NO_TOKEN_PROVIDED
    );
  }

  const [scheme, token] = authHeader.split(" ");
  if ((scheme || "").toLowerCase() !== "bearer" || !token) {
    throw ApiError.unauthorized(
      "Formato de Authorization inválido",
      ERR.AUTH.INVALID_TOKEN
    );
  }

  const payload = verifyAccessToken<AccessJwtPayload>(token.trim(), {
    clockTolerance: 5,
  });
  if (!payload.id || !payload.role) {
    throw ApiError.unauthorized("Token inválido", ERR.AUTH.INVALID_TOKEN);
  }

  return { id: payload.id, role: payload.role, email: payload.email };
}

export function tryExtractUser(req: Request) {
  try {
    return extractUserFromAuthHeader(req);
  } catch {
    return null;
  }
}
