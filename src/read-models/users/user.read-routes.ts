import { optionalAuth } from "@middlewares/optionalAuth";
import {
  getUsernameAvailability,
  getUserProfileSmart,
  listUsers,
} from "@read-models/users/user.read-controller";
import { Router } from "express";

const router = Router();

router.get("/availability/check", optionalAuth, getUsernameAvailability);
router.get("/", optionalAuth, listUsers);
router.get("/:idOrUsername", optionalAuth, getUserProfileSmart);


export default router;
