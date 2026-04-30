import dotenv from "dotenv";
dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing env variable: ${key}`);
  return val;
}

function parseBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePhoneAllowlist(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((raw) => raw.replace(/[\s\-()]/g, ""))
    .map((normalized) => (normalized.startsWith("+") ? normalized : `+${normalized}`));
}

function parseTrustProxy(value: string | undefined, fallback: number | false): number | false {
  if (value === undefined || value.trim() === "") return fallback;
  const trimmed = value.trim().toLowerCase();
  // "true"/"yes"/"on" mean trust 1 proxy hop — never return boolean true which
  // express-rate-limit rejects as ERR_ERL_PERMISSIVE_TRUST_PROXY.
  if (["true", "yes", "on"].includes(trimmed)) return 1;
  if (["0", "false", "no", "off"].includes(trimmed)) return false;
  const asNum = Number.parseInt(trimmed, 10);
  if (Number.isFinite(asNum) && asNum >= 0) return asNum;
  return fallback;
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
  GCAL_CALLBACK_URL: requireEnv("GCAL_CALLBACK_URL", "http://localhost:5000/api/v1/gcal/callback"),
  FRONTEND_URL: requireEnv("FRONTEND_URL", "http://localhost:3001"),
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY, process.env.NODE_ENV === "production" ? 1 : false),
  WHATSAPP_ENABLE_REMINDER_SEND: parseBool(process.env.WHATSAPP_ENABLE_REMINDER_SEND, false),
  WHATSAPP_ALLOWED_REMINDER_NUMBERS: parsePhoneAllowlist(process.env.WHATSAPP_ALLOWED_REMINDER_NUMBERS),
  WHATSAPP_MAX_REMINDER_RECIPIENTS: parsePositiveInt(process.env.WHATSAPP_MAX_REMINDER_RECIPIENTS, 5),
  WHATSAPP_REMINDER_COOLDOWN_MINUTES: parsePositiveInt(process.env.WHATSAPP_REMINDER_COOLDOWN_MINUTES, 720),
} as const;
