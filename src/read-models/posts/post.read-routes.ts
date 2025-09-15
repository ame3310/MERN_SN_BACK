import { optionalAuth } from "@middlewares/optionalAuth";
import {
  getPostWithMeta,
  listPostsWithMeta,
  listUserPostsWithMeta,
} from "@read-models/posts/post.read-controller";
import { Router } from "express";

const router = Router();

router.get("/", optionalAuth, listPostsWithMeta);
router.get("/by-user/:userId", optionalAuth, listUserPostsWithMeta);
router.get("/:id", optionalAuth, getPostWithMeta);

export default router;
