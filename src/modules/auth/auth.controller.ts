import * as authService from "@modules/auth/auth.service";
import { loginSchema, registerSchema } from "@modules/auth/auth.validations";
import {
  REFRESH_COOKIE_NAME,
  getRefreshCookieOptions,
} from "@shared/constants/auth";
import { ApiError } from "@shared/errors/apiError";
import { NextFunction, Request, Response } from "express";

function getRequestMeta(req: Request) {
  return {
    userAgent: req.get("user-agent") ?? undefined,
    ip: req.ip,
  };
}

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, username } = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.register(
      email,
      password,
      username,
      { userAgent: req.get("user-agent") ?? undefined, ip: req.ip }
    );

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
    res.status(201).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const meta = getRequestMeta(req);

    const { user, accessToken, refreshToken } = await authService.login(
      email,
      password,
      meta
    );

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
    res.status(200).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const meta = getRequestMeta(req);

    const { user, accessToken, refreshToken } = await authService.refresh(
      cookieToken,
      meta
    );

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
    res.status(200).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME];

    await authService.logout(userId, cookieToken);
    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
