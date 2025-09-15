import { model, Schema } from "mongoose";
import type { ISessionModel, SessionProps } from "@modules/sessions/session.types";

const sessionSchema = new Schema<SessionProps, ISessionModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String },
    ip: { type: String },
    lastUsedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

sessionSchema.index({ user: 1, revokedAt: 1, lastUsedAt: -1 });

export const Session = model<SessionProps, ISessionModel>("Session", sessionSchema);
