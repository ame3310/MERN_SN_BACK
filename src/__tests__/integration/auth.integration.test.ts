import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";

import { User } from "@modules/users/user.model";
import { REFRESH_COOKIE_NAME } from "@shared/constants/auth";
import app from "app";

describe("Auth Integration", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany();
  });

  describe("Register", () => {
    it("debería registrar un usuario y devolver tokens", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "123456",
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.accessToken).toBeDefined();

      const cookies = res.headers["set-cookie"];
      expect(Array.isArray(cookies)).toBe(true);

      if (Array.isArray(cookies)) {
        expect(cookies.some((c) => c.includes(REFRESH_COOKIE_NAME))).toBe(true);
      }

      const userInDb = await User.findOne({ email: "test@example.com" });
      expect(userInDb).not.toBeNull();
    });

    it("debería fallar si el email ya está registrado", async () => {
      await request(app).post("/api/auth/register").send({
        email: "duplicate@example.com",
        password: "password123",
      });

      const res = await request(app).post("/api/auth/register").send({
        email: "duplicate@example.com",
        password: "password123",
      });

      expect(res.status).toBe(409);
    });
  });

  describe("Login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send({
        email: "login@example.com",
        password: "mypassword",
      });
    });

    it("debería hacer login con credenciales válidas", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "login@example.com",
        password: "mypassword",
      });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.accessToken).toBeDefined();

      const cookies = res.headers["set-cookie"];
      expect(Array.isArray(cookies)).toBe(true);

      if (Array.isArray(cookies)) {
        expect(cookies.some((c) => c.includes(REFRESH_COOKIE_NAME))).toBe(true);
      }
    });

    it("debería fallar si el email no existe", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "unknown@example.com",
        password: "123456",
      });

      expect(res.status).toBe(401);
    });

    it("debería fallar si la contraseña es incorrecta", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "login@example.com",
        password: "wrongpass",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("Refresh Token", () => {
    it("debería renovar el access token usando refresh token válido", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        email: "refresh@example.com",
        password: "testpass",
      });

      const cookies = registerRes.headers["set-cookie"];
      expect(Array.isArray(cookies)).toBe(true);

      if (!Array.isArray(cookies)) throw new Error("No se recibieron cookies");

      const cookie = cookies.find((c) => c.includes(REFRESH_COOKIE_NAME));
      if (!cookie) throw new Error("No se encontró el refresh token cookie");

      const res = await request(app)
        .post("/api/auth/refresh-token")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it("debería fallar sin refresh token", async () => {
      const res = await request(app).post("/api/auth/refresh-token");

      expect(res.status).toBe(401);
    });

    it("debería fallar con refresh token malformado", async () => {
      const res = await request(app)
        .post("/api/auth/refresh-token")
        .set("Cookie", `${REFRESH_COOKIE_NAME}=invalid-token`);

      expect(res.status).toBe(403);
    });
  });

  describe("Logout", () => {
    it("debería hacer logout e invalidar el refresh token", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        email: "logout@example.com",
        password: "testpass",
      });

      const cookies = registerRes.headers["set-cookie"];
      if (!Array.isArray(cookies)) throw new Error("No se recibieron cookies");

      const cookie = cookies.find((c) => c.includes(REFRESH_COOKIE_NAME));
      if (!cookie) throw new Error("No se encontró el refresh token cookie");

      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toMatch(/logout/i);

      const user = await User.findOne({ email: "logout@example.com" }).lean();
      expect(user?.refreshTokenHash).toBeUndefined();
    });

    it("debería responder 200 incluso si no hay cookie", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.status).toBe(200);
    });
  });

  describe("Access Protected Routes", () => {
    it("debería acceder a una ruta protegida con accessToken válido", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        email: "secure@example.com",
        password: "mypassword",
      });

      const { accessToken } = registerRes.body;

      const profileRes = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.email).toBe("secure@example.com");
    });

    it("debería denegar acceso sin accessToken", async () => {
      const res = await request(app).get("/api/users/profile");

      expect(res.status).toBe(401);
    });

    it("debería denegar acceso con accessToken inválido", async () => {
      const res = await request(app)
        .get("/api/users/profile")
        .set("Authorization", "Bearer invalid.token.here");

      expect(res.status).toBe(403);
    });
  });
});
