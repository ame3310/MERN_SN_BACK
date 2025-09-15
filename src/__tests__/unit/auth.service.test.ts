jest.mock("@modules/users/user.model");
jest.mock("@modules/sessions/session.service");
jest.mock("@utils/jwt");

import {
  createSession,
  findActiveSessionByRefresh,
  revokeAllSessions,
  revokeSessionById,
  rotateSession,
} from "@modules/sessions/session.service";
import { User } from "@modules/users/user.model";
import { ApiError } from "@shared/errors/apiError";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@utils/jwt";

import * as authService from "@modules/auth/auth.service";

const mockedUser = jest.mocked(User);
const mockedCreateSession = jest.mocked(createSession);
const mockedFindActiveSessionByRefresh = jest.mocked(findActiveSessionByRefresh);
const mockedRevokeAllSessions = jest.mocked(revokeAllSessions);
const mockedRevokeSessionById = jest.mocked(revokeSessionById);
const mockedRotateSession = jest.mocked(rotateSession);
const mockedGenAccess = jest.mocked(generateAccessToken);
const mockedGenRefresh = jest.mocked(generateRefreshToken);
const mockedVerifyRefresh = jest.mocked(verifyRefreshToken);

function fakeUser(overrides: Partial<any> = {}) {
  return {
    id: "u1",
    email: "john@doe.com",
    role: "user",
    username: "john",
    comparePassword: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGenAccess.mockReturnValue("access.jwt");
  mockedGenRefresh.mockReturnValue("refresh.jwt");
});

// register
describe("auth.service register", () => {
  it("registra usuario y crea sesión", async () => {
    mockedUser.findByEmail.mockResolvedValueOnce(null);
    mockedUser.findByUsername.mockResolvedValueOnce(null);
    const u = fakeUser();
    mockedUser.create.mockResolvedValueOnce(u);

    const result = await authService.register(
      "John@Doe.com",
      "Passw0rd!",
      "john",
      { userAgent: "ua", ip: "127.0.0.1" }
    );

    expect(mockedUser.findByEmail).toHaveBeenCalledWith("john@doe.com");
    expect(mockedUser.findByUsername).toHaveBeenCalledWith("john");
    expect(mockedUser.create).toHaveBeenCalledWith({
      email: "john@doe.com",
      password: "Passw0rd!",
      username: "john",
      usernameLower: "john",
    });
    expect(mockedGenAccess).toHaveBeenCalledWith({ id: "u1", role: "user" });
    expect(mockedGenRefresh).toHaveBeenCalledWith({ id: "u1" });
    expect(mockedCreateSession).toHaveBeenCalledWith("u1", "refresh.jwt", {
      userAgent: "ua",
      ip: "127.0.0.1",
    });
    expect(result).toMatchObject({
      accessToken: "access.jwt",
      refreshToken: "refresh.jwt",
    });
  });

  it("falla si email ya está en uso", async () => {
    mockedUser.findByEmail.mockResolvedValueOnce({ _id: "x" } as any);
    mockedUser.findByUsername.mockResolvedValueOnce(null);

    await expect(
      authService.register("a@a.com", "pw", "john")
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("falla si username ya existe", async () => {
    mockedUser.findByEmail.mockResolvedValueOnce(null);
    mockedUser.findByUsername.mockResolvedValueOnce({ _id: "x" } as any);

    await expect(
      authService.register("a@a.com", "pw", "john")
    ).rejects.toBeInstanceOf(ApiError);
  });
});

//login
describe("auth.service login", () => {
  it("login OK con credenciales válidas", async () => {
    const u = fakeUser({ comparePassword: jest.fn().mockResolvedValue(true) });
    mockedUser.findByEmail.mockResolvedValueOnce(u);

    const result = await authService.login("John@Doe.com", "Passw0rd!", {
      ip: "1.1.1.1",
    });

    expect(mockedUser.findByEmail).toHaveBeenCalledWith("john@doe.com");
    expect(u.comparePassword).toHaveBeenCalledWith("Passw0rd!");
    expect(mockedCreateSession).toHaveBeenCalledWith("u1", "refresh.jwt", {
      ip: "1.1.1.1",
    });
    expect(result.accessToken).toBe("access.jwt");
    expect(result.refreshToken).toBe("refresh.jwt");
  });

  it("lanza unauthorized si email no existe", async () => {
    mockedUser.findByEmail.mockResolvedValueOnce(null);
    await expect(authService.login("no@user.com", "pw")).rejects.toBeInstanceOf(ApiError);
  });

  it("lanza unauthorized si password incorrecto", async () => {
    const u = fakeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
    mockedUser.findByEmail.mockResolvedValueOnce(u);
    await expect(authService.login("a@a.com", "bad")).rejects.toBeInstanceOf(ApiError);
  });
});

//refresh
describe("auth.service refresh", () => {
  it("lanza si falta refresh token", async () => {
    await expect(authService.refresh(undefined)).rejects.toBeInstanceOf(ApiError);
  });

  it("lanza si verifyRefreshToken falla", async () => {
    mockedVerifyRefresh.mockImplementationOnce(() => {
      throw new Error("bad token");
    });
    await expect(authService.refresh("bad.refresh")).rejects.toBeInstanceOf(ApiError);
  });

  it("lanza si user no existe", async () => {
    mockedVerifyRefresh.mockReturnValueOnce({ id: "u1" } as any);
    mockedUser.findById.mockResolvedValueOnce(null);
    await expect(authService.refresh("rt")).rejects.toBeInstanceOf(ApiError);
  });

  it("lanza y revoca todas si no hay sesión activa (reutilización)", async () => {
    mockedVerifyRefresh.mockReturnValueOnce({ id: "u1" } as any);
    mockedUser.findById.mockResolvedValueOnce(fakeUser());
    mockedFindActiveSessionByRefresh.mockResolvedValueOnce(null);

    await expect(authService.refresh("rt")).rejects.toBeInstanceOf(ApiError);
    expect(mockedRevokeAllSessions).toHaveBeenCalledWith("u1");
  });

  it("refresca OK, rota sesión y devuelve tokens", async () => {
    mockedVerifyRefresh.mockReturnValueOnce({ id: "u1" } as any);
    mockedUser.findById.mockResolvedValueOnce(fakeUser());
    mockedFindActiveSessionByRefresh.mockResolvedValueOnce({ _id: "s1" } as any);

    const result = await authService.refresh("old.refresh", { userAgent: "ua" });

    expect(mockedRotateSession).toHaveBeenCalledWith("s1", "u1", "refresh.jwt", { userAgent: "ua" });
    expect(result).toMatchObject({ accessToken: "access.jwt", refreshToken: "refresh.jwt" });
  });
});

// logout
describe("auth.service logout", () => {
  it("si viene refreshToken y hay sesión activa → revokeSessionById", async () => {
    mockedFindActiveSessionByRefresh.mockResolvedValueOnce({ _id: "s1" } as any);

    await authService.logout("u1", "rt");

    expect(mockedRevokeSessionById).toHaveBeenCalledWith({ id: "u1", role: "user" }, "s1");
    expect(mockedRevokeAllSessions).not.toHaveBeenCalled();
  });

  it("si viene refreshToken pero no hay sesión → revokeAllSessions", async () => {
    mockedFindActiveSessionByRefresh.mockResolvedValueOnce(null);

    await authService.logout("u1", "rt");

    expect(mockedRevokeAllSessions).toHaveBeenCalledWith("u1");
  });

  it("si no viene refreshToken → revokeAllSessions", async () => {
    await authService.logout("u1");
    expect(mockedRevokeAllSessions).toHaveBeenCalledWith("u1");
  });
});
