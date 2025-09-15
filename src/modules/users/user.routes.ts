import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import * as userController from "./user.controller";

const router = Router();

router.get("/me", requireAuth, userController.getMe);
router.patch("/me", requireAuth, userController.patchMe);
router.delete("/me", requireAuth, userController.deleteMe);

export default router;
