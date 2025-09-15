import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { ERR } from "../../shared/constants/error-codes";

describe("JWT Utils", () => {
  const accessPayload = { id: "user123", role: "user" as const };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("generateAccessToken debe devolver un string", () => {
    const token = generateAccessToken(accessPayload);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);
  });

  it("generateRefreshToken debe devolver un string", () => {
    const token = generateRefreshToken({ id: accessPayload.id });
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);
  });

  it("verifyAccessToken debe devolver el payload si el token es válido", () => {
    const token = generateAccessToken(accessPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(accessPayload.id);
    expect(decoded.role).toBe(accessPayload.role);
  });

  it("verifyAccessToken debe lanzar TOKEN_EXPIRED si el token está expirado", () => {
    jest.spyOn(jwt, "verify").mockImplementation(() => {
      const e: any = new Error("jwt expired");
      e.name = "TokenExpiredError";
      throw e;
    });

    try {
      verifyAccessToken("cualquier_cosa");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe(ERR.AUTH.TOKEN_EXPIRED);
    }
  });

  it("verifyAccessToken debe lanzar INVALID_TOKEN si el token es inválido", () => {
    jest.spyOn(jwt, "verify").mockImplementation(() => {
      const e: any = new Error("invalid token");
      e.name = "JsonWebTokenError";
      throw e;
    });

    try {
      verifyAccessToken("token_malo");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe(ERR.AUTH.INVALID_TOKEN);
    }
  });

  it("verifyRefreshToken debe devolver { id } si el token es válido", () => {
    const token = generateRefreshToken({ id: accessPayload.id });
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe(accessPayload.id);
  });

  it("verifyRefreshToken debe lanzar REFRESH_TOKEN_INVALID si el token es inválido", () => {
    try {
      verifyRefreshToken("token_refresh_invalido");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe(ERR.AUTH.REFRESH_TOKEN_INVALID);
    }
  });
});
