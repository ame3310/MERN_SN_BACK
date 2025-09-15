import { requireAuth } from "@middlewares/requireAuth";
import { requireOwnerOrAdmin } from "@middlewares/requireOwnerOrAdmin";
import {
  createPost,
  deletePost,
  getPostById,
  updatePost,
} from "@modules/posts/post.controller";
import { Router } from "express";

const router = Router();

router.post("/", requireAuth, createPost);
router.get("/:id", getPostById);
router.patch("/:id", requireAuth, updatePost);
router.delete("/:id", requireAuth, requireOwnerOrAdmin, deletePost);

export default router;
