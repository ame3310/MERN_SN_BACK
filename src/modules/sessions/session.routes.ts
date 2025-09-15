import { requireAuth } from "@middlewares/requireAuth";
import {
  listMySessions,
  revokeAllMySessions,
  revokeSession,
} from "@modules/sessions/session.controller";
import { Router } from "express";

const router = Router();

router.get("/", requireAuth, listMySessions);
router.delete("/", requireAuth, revokeAllMySessions);
router.delete("/:sessionId", requireAuth, revokeSession);

export default router;
