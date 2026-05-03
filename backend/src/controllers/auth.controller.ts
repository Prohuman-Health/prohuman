import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const OAUTH_REDIRECT_COOKIE = "oauth_redirect_origin";

export const oauthRedirectCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/api/v1/auth",
  maxAge: 10 * 60 * 1000,
};

function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) return cookies;

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

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

function resolveFrontendBaseUrl(req: Request): string {
  const cookies = parseCookieHeader(req.headers.cookie);
  return normalizeAbsoluteOrigin(cookies[OAUTH_REDIRECT_COOKIE]) ?? env.FRONTEND_URL;
}

// ── Helper: mint a JWT for any staff row ─────────────────────────────────────
function mintToken(staff: { id: string; role: string; branch_id: string | null }) {
  return jwt.sign(
    { sub: staff.id, role: staff.role, branchId: staff.branch_id },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

// ── Email + password login ────────────────────────────────────────────────────
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await query<{
    id: string; email: string; password_hash: string | null;
    full_name: string; role: string; branch_id: string | null; is_active: boolean;
  }>(
    "SELECT id, email, password_hash, full_name, role, branch_id, is_active FROM staff WHERE email = $1",
    [email]
  );
  const staff = result.rows[0];
  if (!staff) throw ApiError.unauthorized("Invalid email or password");
  if (!staff.password_hash) throw ApiError.badRequest("This account uses Google Sign-In. Please login with Google.");
  if (!(await bcrypt.compare(password, staff.password_hash))) throw ApiError.unauthorized("Invalid email or password");
  if (!staff.is_active) throw ApiError.forbidden("Account is deactivated");

  // Block login if the staff member is a doctor with an active leave period
  if (staff.role === "doctor") {
    const leave = await query(
      `SELECT dlp.from_date, dlp.to_date, dlp.reason
       FROM doctor_leave_periods dlp
       JOIN doctors d ON d.id = dlp.doctor_id
       WHERE d.staff_id = $1
         AND CURRENT_DATE BETWEEN dlp.from_date AND dlp.to_date
       LIMIT 1`,
      [staff.id]
    );
    if (leave.rows[0]) {
      const lv = leave.rows[0];
      const until = new Date(lv.to_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      throw ApiError.forbidden(
        `Account is on leave until ${until}.${lv.reason ? ` Reason: ${lv.reason}` : ""}`
      );
    }
  }

  const token = mintToken(staff);
  ApiResponse.ok(res, {
    token,
    user: { id: staff.id, email: staff.email, full_name: staff.full_name, role: staff.role, branch_id: staff.branch_id },
  });
});

// ── Google OAuth callback ─────────────────────────────────────────────────────
// Called by Passport after Google verifies the user.
// Issues a JWT and redirects the browser to the frontend.
export const googleCallback = (req: Request, res: Response) => {
  const frontendBaseUrl = resolveFrontendBaseUrl(req);
  res.clearCookie(OAUTH_REDIRECT_COOKIE, oauthRedirectCookieOptions);

  const staff = req.user as { id: string; role: string; branch_id: string | null } | undefined;
  if (!staff) {
    return res.redirect(`${frontendBaseUrl}/login?error=google_failed`);
  }
  const token = mintToken(staff);
  // Redirect frontend — it reads ?token= from the URL, stores it, then goes to /dashboard
  res.redirect(`${frontendBaseUrl}/auth/callback?token=${token}`);
};

export const googleFailed = (req: Request, res: Response) => {
  const frontendBaseUrl = resolveFrontendBaseUrl(req);
  res.clearCookie(OAUTH_REDIRECT_COOKIE, oauthRedirectCookieOptions);
  res.redirect(`${frontendBaseUrl}/login?error=google_failed`);
};

// ── Current user ──────────────────────────────────────────────────────────────
export const me = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT s.id, s.email, s.full_name, s.role, s.phone, s.branch_id, s.is_active, s.avatar_url,
            d.id AS doctor_id, d.specialty
     FROM staff s
     LEFT JOIN doctors d ON d.staff_id = s.id
     WHERE s.id = $1`,
    [req.user!.sub]
  );
  if (!result.rows[0]) throw ApiError.notFound("Staff not found");
  ApiResponse.ok(res, result.rows[0]);
});

// ── Change password ───────────────────────────────────────────────────────────
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const result = await query("SELECT password_hash FROM staff WHERE id = $1", [req.user!.sub]);
  const staff = result.rows[0];
  if (!staff?.password_hash) throw ApiError.badRequest("Google Sign-In account — no password to change");
  if (!(await bcrypt.compare(current_password, staff.password_hash)))
    throw ApiError.badRequest("Current password is incorrect");

  const hash = await bcrypt.hash(new_password, 12);
  await query("UPDATE staff SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hash, req.user!.sub]);
  ApiResponse.ok(res, null, "Password updated");
});
