import { Router } from "express";
import passport from "passport";
import { login, me, changePassword, googleCallback } from "../controllers/auth.controller";
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

// ── Email / password ──────────────────────────────────────────────────────────
router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, me);
router.patch("/me/password", authenticate, validate(changePasswordSchema), changePassword);

// ── Google OAuth 2.0 ─────────────────────────────────────────────────────────
// Step 1 — frontend redirects user here to initiate the Google consent screen
router.get(
  "/google",
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
router.get("/google/failed", (_req, res) => {
  res.status(401).json({ success: false, message: "Google authentication failed" });
});

export default router;
