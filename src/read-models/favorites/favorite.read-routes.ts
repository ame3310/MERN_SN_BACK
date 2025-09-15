import { optionalAuth } from "@middlewares/optionalAuth";
import { Router } from "express";
import { listUserFavoritePosts } from "./favorite.read-controller";

const router = Router();

router.get("/:userId/posts", optionalAuth, listUserFavoritePosts);
export default router;
