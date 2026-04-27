import express from "express";
import fs from "fs";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { env } from "./config/env";
import "./config/passport";          // register Google strategy
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app = express();

// Required when running behind Nginx/Cloudflare/ELB so rate limit and req.ip work correctly.
const trustProxySetting = env.TRUST_PROXY === true ? 1 : env.TRUST_PROXY;
app.set("trust proxy", trustProxySetting);

// ── Security & Body Parsing ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());        // no session — JWT only

// ── Logging ──────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Skip rate limiting in development — the dashboard makes many parallel
// requests per page load and 300/15 min is easily exhausted during local work.
if (env.NODE_ENV !== "development") {
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,   // 15 min
      max: 2000,                   // raised from 300 — admin panel is request-heavy
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later." },
    })
  );
}

// Tighter limit on auth endpoints (applies in all environments)
app.use(
  "/api/auth/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: "Too many login attempts" })
);

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", env: env.NODE_ENV }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/v1", routes);

// ── Static uploads ────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR));

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
