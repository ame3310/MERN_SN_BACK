import { requireAuth } from "@middlewares/requireAuth";
import {
  addFavorite,
  getFavoriteCount,
  isFavoritedByUser,
  removeFavorite,
} from "@modules/favorites/favorite.controller";
import { Router } from "express";

const router = Router();

router.post("/", requireAuth, addFavorite);
router.delete("/", requireAuth, removeFavorite);
router.get("/count", getFavoriteCount);
router.get("/is-favorited", requireAuth, isFavoritedByUser);

export default router;
