import dotenv from "dotenv";
dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing env variable: ${key}`);
  return val;
}

export const env = {
  NODE_ENV: requireEnv("NODE_ENV", "development"),
  PORT: parseInt(requireEnv("PORT", "5000"), 10),
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: requireEnv("JWT_EXPIRES_IN", "7d"),
  CORS_ORIGIN: requireEnv("CORS_ORIGIN", "http://localhost:3000"),
  GOOGLE_CLIENT_ID: requireEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: requireEnv("GOOGLE_CLIENT_SECRET"),
  GOOGLE_CALLBACK_URL: requireEnv("GOOGLE_CALLBACK_URL"),
  FRONTEND_URL: requireEnv("FRONTEND_URL", "http://localhost:3001"),
} as const;
