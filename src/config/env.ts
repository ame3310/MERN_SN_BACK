import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().default(5000),

  MONGO_URI: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(1),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("60m"),

  REFRESH_TOKEN_SECRET: z.string().min(1),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("24h"),

  CORS_ORIGINS: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Error en variables de entorno:",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}
export const env = parsed.data;
