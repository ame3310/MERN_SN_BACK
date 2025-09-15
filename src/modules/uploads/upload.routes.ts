import { Router } from "express";
import { requireAuth } from "@middlewares/requireAuth";
import { getSignedBatch, getSignedFields } from "@modules/uploads/upload.controller";

const router = Router();

router.get("/sign", requireAuth, getSignedFields);
router.post("/sign-batch", requireAuth, getSignedBatch);

export default router;
