import { isValidObjectId } from "mongoose";
import { ApiError } from "@shared/errors/apiError";
import { ERR } from "@shared/constants/error-codes";

export function assertValidObjectId(id: string, what = "ID") {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest(`${what} inválido`, ERR.COMMON.BAD_REQUEST);
  }
}
