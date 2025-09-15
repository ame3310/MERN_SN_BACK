export const REFRESH_COOKIE_NAME = "refreshToken";

export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
