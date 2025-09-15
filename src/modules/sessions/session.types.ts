import type { HydratedDocument, Model, Types } from "mongoose";

export interface SessionProps {
  user: Types.ObjectId;
  refreshTokenHash: string;
  userAgent?: string;
  ip?: string;
  lastUsedAt?: Date;
  revokedAt?: Date | null;
  createdAt?: Date;
}

export type SessionDocument = HydratedDocument<SessionProps>;

export interface ISessionModel extends Model<SessionProps> {}

export type PublicSession = {
  id: string;
  userId: string;
  userAgent?: string;
  ip?: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string | null;
  active: boolean;
};

export function toPublicSession(doc: SessionDocument): PublicSession {
  return {
    id: doc._id.toString(),
    userId: doc.user.toString(),
    userAgent: doc.userAgent,
    ip: doc.ip,
    createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
    lastUsedAt: doc.lastUsedAt ? doc.lastUsedAt.toISOString() : undefined,
    revokedAt: doc.revokedAt ? doc.revokedAt.toISOString() : null,
    active: !doc.revokedAt,
  };
}
