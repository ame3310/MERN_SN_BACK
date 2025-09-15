import { optionalAuth } from "@middlewares/optionalAuth";
import { searchHandler } from "@read-models/searches/search.read-controller";
import { Router } from "express";

const router = Router();
router.get("/", optionalAuth, searchHandler);
export default router;
