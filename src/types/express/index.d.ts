import type { AccessJwtPayload } from "@utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: Pick<AccessJwtPayload, "id" | "role" | "email"> | null;
    }
  }
}
export {};
