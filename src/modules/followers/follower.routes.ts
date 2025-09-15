import { requireAuth } from "@middlewares/requireAuth";
import { follow, unfollow } from "@modules/followers/follower.controller";
import { Router } from "express";

const router = Router();

router.post("/", requireAuth, follow);
router.delete("/", requireAuth, unfollow);

export default router;
