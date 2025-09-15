import { User } from "@modules/users/user.model";
import type { PublicUser } from "@modules/users/user.types";
import { toPublicUser } from "@modules/users/user.types";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";

export async function getById(id: string): Promise<PublicUser> {
  const user = await User.findById(id);
  if (!user)
    throw ApiError.notFound("Usuario no encontrado", ERR.USER.NOT_FOUND);
  return toPublicUser(user);
}

export async function updateMe(
  id: string,
  data: Partial<{ avatarUrl: string; bio: string }>
): Promise<PublicUser> {
  const updated = await User.findByIdAndUpdate(id, data, { new: true });
  if (!updated)
    throw ApiError.notFound("Usuario no encontrado", ERR.USER.NOT_FOUND);
  return toPublicUser(updated);
}

export async function deleteMe(id: string): Promise<void> {
  const deleted = await User.findByIdAndDelete(id);
  if (!deleted)
    throw ApiError.notFound("Usuario no encontrado", ERR.USER.NOT_FOUND);
}
