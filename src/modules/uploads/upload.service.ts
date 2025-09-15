import type { SignedUploadFields } from "@modules/uploads/upload.types";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY = process.env.CLOUDINARY_API_KEY!;
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;
const BASE = process.env.CLOUDINARY_BASE_FOLDER || "rrss";
const ENV = process.env.NODE_ENV || "development";

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  throw new Error(
    "Missing Cloudinary envs: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
  );
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

type Kind = "post" | "avatar";

function folderFor(userId: string, kind: Kind) {
  const sub = kind === "post" ? "posts" : "avatars";
  return `${BASE}/${ENV}/users/${userId}/${sub}`;
}

export function signOne(userId: string, kind: Kind): SignedUploadFields {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = folderFor(userId, kind);
  const publicId = randomUUID();

  const overwrite = false;
  const payload: Record<string, string | number | boolean> = {
    timestamp,
    folder,
    public_id: publicId,
    overwrite,
  };

  const signature = cloudinary.utils.api_sign_request(payload, API_SECRET);

  return {
    cloudName: CLOUD_NAME,
    apiKey: API_KEY,
    signature,
    timestamp,
    folder,
    publicId,
    overwrite,
    resourceType: "image",
  };
}
