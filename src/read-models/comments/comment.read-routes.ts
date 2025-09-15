import { Router } from "express";
import { listCommentsByPostWithMetaController } from "./comment.read-controller";

const router = Router();

router.get("/by-post", listCommentsByPostWithMetaController);
export default router;
