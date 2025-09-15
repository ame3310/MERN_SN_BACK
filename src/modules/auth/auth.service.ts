import {
  createSession,
  findActiveSessionByRefresh,
  revokeAllSessions,
  revokeSessionById,
  rotateSession,
} from "@modules/sessions/session.service";
import { User } from "@modules/users/user.model";
import type { PublicUser, UserDocument } from "@modules/users/user.types";
import { toPublicUser } from "@modules/users/user.types";
import { usernameSchema } from "@modules/users/user.validations";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@utils/jwt";

type Tokens = { accessToken: string; refreshToken: string };
type AuthResult = { user: PublicUser } & Tokens;
type Meta = { userAgent?: string; ip?: string };

type AccessPayload = { id: string; role: "user" | "admin" };
type RefreshPayload = { id: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function issueTokens(user: UserDocument): Promise<Tokens> {
  const accessToken = generateAccessToken({
    id: user.id,
    role: user.role,
  } satisfies AccessPayload);
  const refreshToken = generateRefreshToken({
    id: user.id,
  } satisfies RefreshPayload);
  return { accessToken, refreshToken };
}

export async function register(
  email: string,
  password: string,
  username: string,
  meta?: Meta
): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);

  usernameSchema.parse(username);

  const [emailTaken, usernameTaken] = await Promise.all([
    User.findByEmail(normalizedEmail),
    User.findByUsername(username),
  ]);
  if (emailTaken)
    throw ApiError.badRequest("Email ya registrado", ERR.USER.EMAIL_IN_USE);
  if (usernameTaken)
    throw ApiError.badRequest(
      "Username no disponible",
      ERR.USER.USERNAME_TAKEN
    );

  const user = await User.create({
    email: normalizedEmail,
    password,
    username,
    usernameLower: username.toLowerCase(),
  });

  const tokens = await issueTokens(user);
  await createSession(user.id, tokens.refreshToken, meta);

  return { user: toPublicUser(user), ...tokens };
}

export async function login(
  email: string,
  password: string,
  meta?: Meta
): Promise<AuthResult> {
  const normalized = normalizeEmail(email);

  const user = await User.findByEmail(normalized);
  if (!user) {
    throw ApiError.unauthorized(
      "Credenciales inválidas",
      ERR.AUTH.INVALID_CREDENTIALS
    );
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    throw ApiError.unauthorized(
      "Credenciales inválidas",
      ERR.AUTH.INVALID_CREDENTIALS
    );
  }

  const tokens = await issueTokens(user);
  await createSession(user.id, tokens.refreshToken, meta);

  return { user: toPublicUser(user), ...tokens };
}

export async function refresh(
  refreshToken?: string,
  meta?: Meta
): Promise<AuthResult> {
  if (!refreshToken) {
    throw ApiError.unauthorized(
      "Refresh ausente",
      ERR.AUTH.REFRESH_TOKEN_INVALID
    );
  }

  let payload: RefreshPayload;
  try {
    payload = verifyRefreshToken<RefreshPayload>(refreshToken);
  } catch {
    throw ApiError.unauthorized(
      "Refresh inválido",
      ERR.AUTH.REFRESH_TOKEN_INVALID
    );
  }

  const user = await User.findById(payload.id);
  if (!user)
    throw ApiError.unauthorized("No autorizado", ERR.COMMON.UNAUTHORIZED);

  const session = await findActiveSessionByRefresh(user.id, refreshToken);
  if (!session) {
    await revokeAllSessions(user.id);
    throw ApiError.unauthorized(
      "Reutilización detectada",
      ERR.AUTH.REFRESH_REUSE_DETECTED
    );
  }

  const tokens = await issueTokens(user);
  await rotateSession(
    session._id.toString(),
    user.id,
    tokens.refreshToken,
    meta
  );

  return { user: toPublicUser(user), ...tokens };
}

export async function logout(
  userId: string,
  refreshToken?: string
): Promise<void> {
  if (refreshToken) {
    const active = await findActiveSessionByRefresh(userId, refreshToken);
    if (active) {
      await revokeSessionById(
        { id: userId, role: "user" },
        active._id.toString()
      );
      return;
    }
  }
  await revokeAllSessions(userId);
}
