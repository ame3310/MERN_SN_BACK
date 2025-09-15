import { env } from "@config/env";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import jwt, { SignOptions, JwtPayload as StdJwtPayload } from "jsonwebtoken";
import ms, { StringValue as MsStringValue } from "ms";

export type AccessJwtPayload = {
  id: string;
  role: "user" | "admin";
  email?: string;
  iat?: number;
  exp?: number;
};

type VerifyOpts = { clockTolerance?: number };

function parseExpiresToSeconds(value: string): number {
  if (/^\d+$/.test(value)) return Number(value);
  const millis = ms(value as MsStringValue);
  if (typeof millis !== "number") {
    throw new Error(`Invalid EXPIRES_IN value: '${value}'`);
  }
  return Math.floor(millis / 1000);
}

const sign = (payload: object, secret: string, expiresIn: string): string => {
  const opts: SignOptions = {
    expiresIn: parseExpiresToSeconds(expiresIn),
    algorithm: "HS256",
  };
  return jwt.sign(payload, secret, opts);
};

export const generateAccessToken = (payload: AccessJwtPayload): string =>
  sign(payload, env.ACCESS_TOKEN_SECRET, env.ACCESS_TOKEN_EXPIRES_IN);

export const generateRefreshToken = (payload: { id: string }): string =>
  sign(payload, env.REFRESH_TOKEN_SECRET, env.REFRESH_TOKEN_EXPIRES_IN);

export function verifyAccessToken<AccessPayload = AccessJwtPayload>(
  token: string,
  opts?: VerifyOpts
): AccessPayload {
  try {
    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
      clockTolerance: opts?.clockTolerance ?? 0,
    });

    if (typeof decoded === "string") {
      throw ApiError.unauthorized("Token inválido", ERR.AUTH.INVALID_TOKEN);
    }

    return decoded as AccessPayload;
  } catch (e: any) {
    const name = String(e?.name ?? "").toLowerCase();
    const msg = String(e?.message ?? "").toLowerCase();

    if (name.includes("tokenexpirederror") || msg.includes("expired")) {
      throw ApiError.unauthorized(
        "Access token expirado",
        ERR.AUTH.ACCESS_TOKEN_EXPIRED,
        undefined,
        {
          "WWW-Authenticate":
            'Bearer error="invalid_token", error_description="access token expired"',
        }
      );
    }
    throw ApiError.unauthorized("Token inválido", ERR.AUTH.INVALID_TOKEN);
  }
}

export function verifyRefreshToken<
  RefreshPayload extends { id: string } = { id: string }
>(token: string): RefreshPayload {
  try {
    const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET);
    if (typeof decoded === "string") {
      throw ApiError.forbidden(
        "Refresh token inválido",
        ERR.AUTH.REFRESH_TOKEN_INVALID
      );
    }
    return decoded as RefreshPayload;
  } catch {
    throw ApiError.forbidden(
      "Refresh token inválido",
      ERR.AUTH.REFRESH_TOKEN_INVALID
    );
  }
}

export function decodeToken<T = StdJwtPayload>(token: string): T | null {
  const d = jwt.decode(token);
  return d && typeof d !== "string" ? (d as T) : null;
}
