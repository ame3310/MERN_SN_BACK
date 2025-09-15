import { optionalAuth } from "@middlewares/optionalAuth";
import {
  getFollowers,
  getFollowing,
} from "@read-models/followers/follower.read-controller";
import { Router } from "express";

const router = Router();

router.get("/:userId/followers", optionalAuth, getFollowers);
router.get("/:userId/following", optionalAuth, getFollowing);

export default router;
