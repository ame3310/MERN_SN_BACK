import { requireAuth } from "@middlewares/requireAuth";
import { requireOwnerOrAdmin } from "@middlewares/requireOwnerOrAdmin";
import {
  createComment,
  deleteComment,
  getCommentById,
  updateComment,
} from "@modules/comments/comment.controller";
import { Router } from "express";

const router = Router();

router.post("/", requireAuth, createComment);
router.get("/:commentId", getCommentById);
router.patch("/:commentId", requireAuth, updateComment);
router.delete("/:commentId", requireAuth, requireOwnerOrAdmin, deleteComment);

export default router;
