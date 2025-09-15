import { errorHandler } from "@middlewares/errorHandler";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import helmet from "helmet";

import { env } from "@config/env";
import { ApiError } from "@shared/errors/apiError";

import authRoutes from "@modules/auth/auth.routes";
import commentRoutes from "@modules/comments/comment.routes";
import favoriteRoutes from "@modules/favorites/favorite.routes";
import followerRoutes from "@modules/followers/follower.routes";
import likeRoutes from "@modules/likes/like.routes";
import postRoutes from "@modules/posts/post.routes";
import sessionRoutes from "@modules/sessions/session.routes";
import uploadRoutes from "@modules/uploads/upload.routes";
import userRoutes from "@modules/users/user.routes";

import commentReadRoutes from "@read-models/comments/comment.read-routes";
import favoriteReadRoutes from "@read-models/favorites/favorite.read-routes";
import feedReadRoutes from "@read-models/feeds/feed.read-routes";
import followerReadRoutes from "@read-models/followers/follower.read-routes";
import postReadRoutes from "@read-models/posts/post.read-routes";
import searchReadRoutes from "@read-models/searches/search.read-routes";
import userReadRoutes from "@read-models/users/user.read-routes";

const app: Application = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.set("etag", false);
app.use(helmet());

const origins = (env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.send("API funcionando");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/posts", postRoutes);
app.use("/comments", commentRoutes);
app.use("/likes", likeRoutes);
app.use("/favorites", favoriteRoutes);
app.use("/followers", followerRoutes);
app.use("/sessions", sessionRoutes);
app.use("/uploads", uploadRoutes);

app.use("/read", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, private, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Cookie, Authorization");
  next();
});

app.use("/read/search", searchReadRoutes);
app.use("/read/posts", postReadRoutes);
app.use("/read/comments", commentReadRoutes);
app.use("/read/favorites", favoriteReadRoutes);
app.use("/read/users", userReadRoutes);
app.use("/read/followers", followerReadRoutes);
app.use("/read/feeds", feedReadRoutes);

app.use((_req, _res, next) => {
  next(ApiError.notFound("Ruta no encontrada"));
});

app.use(errorHandler);

export default app;
