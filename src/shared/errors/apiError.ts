import type { ErrorCode } from "@shared/constants/error-codes";
import { ERR } from "@shared/constants/error-codes";

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly headers?: Record<string, string>;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: ErrorCode,
    details?: unknown,
    headers?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code ?? ERR.COMMON.INTERNAL_ERROR;
    this.details = details;
    this.headers = headers;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static notFound(
    message = "Recurso no encontrado",
    code?: ErrorCode,
    details?: unknown,
    headers?: Record<string, string>
  ) {
    return new ApiError(
      message,
      404,
      code ?? ERR.COMMON.NOT_FOUND,
      details,
      headers
    );
  }

  static badRequest(
    message = "Petición inválida",
    code?: ErrorCode,
    details?: unknown,
    headers?: Record<string, string>
  ) {
    return new ApiError(
      message,
      400,
      code ?? ERR.COMMON.BAD_REQUEST,
      details,
      headers
    );
  }

  static unauthorized(
    message = "No autorizado",
    code?: ErrorCode,
    details?: unknown,
    headers?: Record<string, string>
  ) {
    return new ApiError(
      message,
      401,
      code ?? ERR.COMMON.UNAUTHORIZED,
      details,
      headers
    );
  }

  static forbidden(
    message = "Prohibido",
    code?: ErrorCode,
    details?: unknown,
    headers?: Record<string, string>
  ) {
    return new ApiError(
      message,
      403,
      code ?? ERR.COMMON.FORBIDDEN,
      details,
      headers
    );
  }
}
