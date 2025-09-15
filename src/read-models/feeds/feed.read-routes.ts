import { optionalAuth } from "@middlewares/optionalAuth";
import { requireAuth } from "@middlewares/requireAuth";
import { Router } from "express";
import { getMyFeed, getUserFeed } from "./feed.read-controller";

const router = Router();

router.get("/", requireAuth, getMyFeed);
router.get("/:userId", optionalAuth, getUserFeed);

export default router;
