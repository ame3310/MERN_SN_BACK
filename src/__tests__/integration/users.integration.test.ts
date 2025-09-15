import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";

import { User } from "@modules/users/user.model";
import { REFRESH_COOKIE_NAME } from "@shared/constants/auth";
import app from "app";

describe("User Integration", () => {
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

  async function registerAndLoginUser() {
    const email = "me@example.com";
    const password = "123456";

    const registerRes = await request(app).post("/api/auth/register").send({
      email,
      password,
    });

    const accessToken = registerRes.body.accessToken;
    const rawCookies = registerRes.headers["set-cookie"];
    const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies ?? ""];
    const refreshTokenCookie = cookies?.find((c) =>
      c.includes(REFRESH_COOKIE_NAME)
    );

    return {
      accessToken,
      refreshTokenCookie,
      email,
    };
  }

  describe("GET /api/users/me", () => {
    it("debería devolver los datos del usuario logueado", async () => {
      const { accessToken } = await registerAndLoginUser();

      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("me@example.com");
      expect(res.body).not.toHaveProperty("password");
    });

    it("debería fallar sin token", async () => {
      const res = await request(app).get("/api/users/me");

      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/users/me", () => {
    it("debería actualizar avatar y bio del usuario", async () => {
      const { accessToken } = await registerAndLoginUser();

      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          avatarUrl: "https://example.com/avatar.png",
          bio: "Nuevo bio actualizado",
        });

      expect(res.status).toBe(200);
      expect(res.body.avatarUrl).toBe("https://example.com/avatar.png");
      expect(res.body.bio).toBe("Nuevo bio actualizado");
    });

    it("debería fallar si no se envía token", async () => {
      const res = await request(app).patch("/api/users/me").send({
        avatarUrl: "https://example.com/avatar.png",
      });

      expect(res.status).toBe(401);
    });

    it("debería fallar si el body no pasa validación", async () => {
      const { accessToken } = await registerAndLoginUser();

      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          avatarUrl: 123,
        });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/users/me", () => {
    it("debería eliminar al usuario autenticado", async () => {
      const { accessToken, email } = await registerAndLoginUser();

      const res = await request(app)
        .delete("/api/users/me")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(204);

      const userInDb = await User.findOne({ email });
      expect(userInDb).toBeNull();
    });

    it("debería fallar si no se envía token", async () => {
      const res = await request(app).delete("/api/users/me");

      expect(res.status).toBe(401);
    });
  });
});
