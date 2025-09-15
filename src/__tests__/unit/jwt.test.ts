import { ERR } from "@shared/constants/error-codes";

let jwtUtil: typeof import("../../utils/jwt");
const OLD_ENV = process.env;

describe("utils/jwt", () => {
  beforeAll(() => {
    process.env = {
      ...OLD_ENV,
      ACCESS_TOKEN_SECRET: "access-secret-for-tests",
      REFRESH_TOKEN_SECRET: "refresh-secret-for-tests",
      ACCESS_TOKEN_EXPIRES_IN: "1s",
      REFRESH_TOKEN_EXPIRES_IN: "1h",
    };

    jest.resetModules();
    jest.isolateModules(() => {
      jwtUtil = require("../../utils/jwt") as typeof import("../../utils/jwt");
    });
  });

  afterAll(() => {
    jest.useRealTimers();
    process.env = OLD_ENV;
  });

  it("access: generate + verify (happy path)", () => {
    const { generateAccessToken, verifyAccessToken } = jwtUtil;
    const token = generateAccessToken({
      id: "u1",
      role: "user",
      email: "a@b.com",
    });
    const dec = verifyAccessToken(token) as any;
    expect(dec.id).toBe("u1");
    expect(dec.role).toBe("user");
  });

  it("refresh: generate + verify", () => {
    const { generateRefreshToken, verifyRefreshToken } = jwtUtil;
    const token = generateRefreshToken({ id: "u2" });
    const dec = verifyRefreshToken(token) as any;
    expect(dec.id).toBe("u2");
  });

  it("decodeToken → null con basura", () => {
    const { decodeToken } = jwtUtil;
    expect(decodeToken("not-a-jwt")).toBeNull();
  });

  it("verifyAccessToken lanza ApiError ACCESS_TOKEN_EXPIRED si ha expirado", () => {
    const { generateAccessToken, verifyAccessToken } = jwtUtil;

    jest.useFakeTimers();
    const token = generateAccessToken({ id: "u3", role: "user" });
    jest.advanceTimersByTime(2000); 

    try {
      verifyAccessToken(token);
      throw new Error("debió lanzar expirado");
    } catch (e: any) {
      expect(e?.constructor?.name).toBe("ApiError");
      expect(e.code).toBe(ERR.AUTH.ACCESS_TOKEN_EXPIRED);
      expect(e.statusCode).toBe(401);
    }
  });

  it("verifyRefreshToken lanza ApiError para token inválido", () => {
    const { verifyRefreshToken } = jwtUtil;
    try {
      verifyRefreshToken("nope");
      throw new Error("debió lanzar inválido");
    } catch (e: any) {
      expect(e?.constructor?.name).toBe("ApiError");
      expect(e.statusCode).toBe(403);
      expect(e.code).toBeDefined();
    }
  });
});
