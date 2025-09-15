import { Follower } from "@modules/followers/follower.model";
import { User } from "@modules/users/user.model";
import type { PublicUser } from "@modules/users/user.types";
import { toPublicUser } from "@modules/users/user.types";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import { isValidObjectId } from "mongoose";

function assertObjectId(id: string, label: string) {
  if (!isValidObjectId(id))
    throw ApiError.badRequest(`${label} inválido`, ERR.COMMON.BAD_REQUEST);
}

export async function listFollowers(opts: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: PublicUser[];
  page: number;
  limit: number;
  total: number;
}> {
  assertObjectId(opts.userId, "userId");
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

  const [rels, total] = await Promise.all([
    Follower.find({ followee: opts.userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Follower.countDocuments({ followee: opts.userId }),
  ]);

  const userIds = rels.map((r) => r.follower);
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
    : [];
  const publicById = new Map(
    users.map((u) => [u._id.toString(), toPublicUser(u)])
  );

  const data = userIds
    .map((id) => publicById.get(id.toString()))
    .filter(Boolean) as PublicUser[];
  return { data, page, limit, total };
}

export async function listFollowing(opts: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: PublicUser[];
  page: number;
  limit: number;
  total: number;
}> {
  assertObjectId(opts.userId, "userId");
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

  const [rels, total] = await Promise.all([
    Follower.find({ follower: opts.userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Follower.countDocuments({ follower: opts.userId }),
  ]);

  const userIds = rels.map((r) => r.followee);
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
    : [];
  const publicById = new Map(
    users.map((u) => [u._id.toString(), toPublicUser(u)])
  );

  const data = userIds
    .map((id) => publicById.get(id.toString()))
    .filter(Boolean) as PublicUser[];
  return { data, page, limit, total };
}
