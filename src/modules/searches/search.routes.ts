import { Router } from "express";
import {
  searchPostsController,
  searchUsersController,
} from "@modules/searches/search.controller";

export const searchRouter = Router();

searchRouter.get("/posts", searchPostsController);
searchRouter.get("/users", searchUsersController);
