import type {
  IUserMethods,
  IUserModel,
  UserDocument,
  UserProps,
} from "@modules/users/user.types";
import { ERR } from "@shared/constants/error-codes";
import { ApiError } from "@shared/errors/apiError";
import bcrypt from "bcryptjs";
import { Schema, model } from "mongoose";

const SALT_ROUNDS = 12;

const userSchema = new Schema<UserProps, IUserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },

    username: { type: String, required: true, trim: true },
    usernameLower: {
      type: String,
      required: true,
      trim: true,
    },

    displayName: { type: String, trim: true },

    avatarUrl: { type: String },
    avatarPublicId: { type: String },
    bio: { type: String },

    refreshTokenHash: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc: UserDocument, ret: any) => {
        delete ret.password;
        delete ret.refreshTokenHash;
        delete ret.usernameLower;
        return ret;
      },
    },
  }
);

userSchema.index({ usernameLower: 1 }, { unique: true });
userSchema.index({ displayName: 1, createdAt: -1 });

userSchema.pre("validate", function (next) {
  if (this.isModified("username")) {
    if (!this.username) {
      return next(
        ApiError.badRequest("Username requerido", ERR.USER.USERNAME_REQUIRED)
      );
    }
    this.username = this.username.trim();
    this.usernameLower = this.username.toLowerCase();
  }
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.method("comparePassword", function (plain: string) {
  return bcrypt.compare(plain, this.password);
});

userSchema.static("findByEmail", function (email: string) {
  return this.findOne({ email: email.toLowerCase().trim() });
});

userSchema.static("findByUsername", function (username: string) {
  return this.findOne({ usernameLower: username.trim().toLowerCase() });
});

export const User = model<UserProps, IUserModel>("User", userSchema);
