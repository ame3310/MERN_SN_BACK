import { Router } from "express";
import { requireAuth } from "@middlewares/requireAuth";
import {
  getLikeCount,
  isLikedByUser,
  likeTarget,
  unlikeTarget,
} from "@modules/likes/like.controller";

const router = Router();

router.post("/", requireAuth, likeTarget);
router.delete("/", requireAuth, unlikeTarget);
router.get("/count", getLikeCount);
router.get("/is-liked", requireAuth, isLikedByUser);
export default router;
