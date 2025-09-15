import { Session } from "@modules/sessions/session.model";
import type {
  PublicSession,
  SessionDocument,
} from "@modules/sessions/session.types";
import { toPublicSession } from "@modules/sessions/session.types";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { safeEqualHex, sha256Hex } from "@shared/security/crypto";
import { isValidObjectId } from "mongoose";

function assertObjectId(id: string, label = "ID") {
  if (!isValidObjectId(id))
    throw ApiError.badRequest(`${label} inválido`, ERR.COMMON.BAD_REQUEST);
}

export async function createSession(
  userId: string,
  refreshToken: string,
  meta?: { userAgent?: string; ip?: string }
): Promise<PublicSession> {
  assertObjectId(userId, "ID de usuario");
  const doc = await Session.create({
    user: userId,
    refreshTokenHash: sha256Hex(refreshToken),
    userAgent: meta?.userAgent,
    ip: meta?.ip,
  });
  return toPublicSession(doc);
}

export async function findActiveSessionByRefresh(
  userId: string,
  refreshToken: string
): Promise<SessionDocument | null> {
  assertObjectId(userId, "ID de usuario");
  const presented = sha256Hex(refreshToken);
  const sessions = await Session.find({ user: userId, revokedAt: null }).select(
    "_id refreshTokenHash"
  );
  const match = sessions.find((s) =>
    safeEqualHex(s.refreshTokenHash, presented)
  );
  return match ? Session.findById(match._id) : null;
}

export async function touchSession(sessionId: string): Promise<void> {
  assertObjectId(sessionId, "ID de sesión");
  await Session.findByIdAndUpdate(sessionId, { lastUsedAt: new Date() });
}

export async function rotateSession(
  oldSessionId: string,
  userId: string,
  newRefreshToken: string,
  meta?: { userAgent?: string; ip?: string }
): Promise<PublicSession> {
  assertObjectId(oldSessionId, "ID de sesión");
  assertObjectId(userId, "ID de usuario");
  await Session.findByIdAndUpdate(oldSessionId, { revokedAt: new Date() });
  return createSession(userId, newRefreshToken, meta);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  assertObjectId(userId, "ID de usuario");
  await Session.updateMany(
    { user: userId, revokedAt: null },
    { revokedAt: new Date() }
  );
}

export async function revokeSessionById(
  requester: { id: string; role: "user" | "admin" },
  sessionId: string
): Promise<void> {
  assertObjectId(sessionId, "ID de sesión");
  const doc = await Session.findById(sessionId);
  if (!doc)
    throw ApiError.notFound("Sesión no encontrada", ERR.AUTH.SESSION_NOT_FOUND);

  const isOwner = doc.user.toString() === requester.id;
  if (!isOwner && requester.role !== "admin") {
    throw ApiError.forbidden(
      "No puedes cerrar esta sesión",
      ERR.COMMON.FORBIDDEN
    );
  }
  if (!doc.revokedAt) {
    await Session.findByIdAndUpdate(sessionId, { revokedAt: new Date() });
  }
}

export async function listMySessions(userId: string): Promise<PublicSession[]> {
  assertObjectId(userId, "ID de usuario");
  const docs = await Session.find({ user: userId }).sort({
    revokedAt: 1,
    lastUsedAt: -1,
    createdAt: -1,
  });
  return docs.map(toPublicSession);
}
