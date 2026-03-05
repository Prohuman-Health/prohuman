import dotenv from "dotenv";
dotenv.config();

function require(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing env variable: ${key}`);
  return val;
}

export const env = {
  NODE_ENV: require("NODE_ENV", "development"),
  PORT: parseInt(require("PORT", "5000"), 10),
  DATABASE_URL: require("DATABASE_URL"),
  JWT_SECRET: require("JWT_SECRET"),
  JWT_EXPIRES_IN: require("JWT_EXPIRES_IN", "7d"),
  CORS_ORIGIN: require("CORS_ORIGIN", "http://localhost:3000"),
  GOOGLE_CLIENT_ID: require("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: require("GOOGLE_CLIENT_SECRET"),
  GOOGLE_CALLBACK_URL: require("GOOGLE_CALLBACK_URL"),
  FRONTEND_URL: require("FRONTEND_URL", "http://localhost:3001"),
} as const;
