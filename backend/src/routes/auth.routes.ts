import { NextFunction, Request, Response, Router } from "express";
import passport from "passport";
import {
  changePassword,
  googleCallback,
  googleFailed,
  login,
  me,
  OAUTH_REDIRECT_COOKIE,
  oauthRedirectCookieOptions,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

// ── Ensure Passport strategy is registered ────────────────────────────────────
import "../config/passport";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(8),
});

const router = Router();

function normalizeAbsoluteOrigin(value?: string): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(req: Request): string | null {
  return normalizeAbsoluteOrigin(req.get("origin") ?? req.get("referer") ?? undefined);
}

function captureFrontendRedirectOrigin(req: Request, res: Response, next: NextFunction) {
  const requestedRedirect = typeof req.query.redirect_uri === "string"
    ? normalizeAbsoluteOrigin(req.query.redirect_uri)
    : null;
  const requestOrigin = getRequestOrigin(req);

  if (requestedRedirect && requestOrigin && requestedRedirect === requestOrigin) {
    res.cookie(OAUTH_REDIRECT_COOKIE, requestedRedirect, oauthRedirectCookieOptions);
  } else {
    res.clearCookie(OAUTH_REDIRECT_COOKIE, oauthRedirectCookieOptions);
  }

  next();
}

// ── Email / password ──────────────────────────────────────────────────────────
router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, me);
router.patch("/me/password", authenticate, validate(changePasswordSchema), changePassword);

// ── Google OAuth 2.0 ─────────────────────────────────────────────────────────
// Step 1 — frontend redirects user here to initiate the Google consent screen
router.get(
  "/google",
  captureFrontendRedirectOrigin,
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

// Step 2 — Google redirects back here after user consents
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/v1/auth/google/failed",
  }),
  googleCallback   // issues JWT and redirects browser → frontend?token=...
);

// Fallback error page (in case Passport's failureRedirect is hit)
router.get("/google/failed", googleFailed);

export default router;
