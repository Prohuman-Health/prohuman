/**
 * gcal.controller.ts
 *
 * Handles Google Calendar OAuth + event fetching for individual doctors.
 * This is a SEPARATE OAuth scope from the login OAuth — it requests
 * calendar.readonly so we can pull the doctor's personal busy events.
 *
 * Flow:
 *  1. GET /gcal/connect        → redirect to Google with calendar scope
 *  2. GET /gcal/callback       → exchange code → store access+refresh token in DB
 *  3. GET /gcal/status         → { connected: bool, calendar_id, connected_at }
 *  4. GET /gcal/events?date=   → return busy/personal events for that day
 *  5. DELETE /gcal/disconnect  → remove tokens from DB
 */

import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { query } from "../config/db";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

// ── Cookie used to carry the return-to URL across the OAuth redirect ──────────
const GCAL_STATE_COOKIE = "gcal_connect_state";
const GCAL_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/api/v1/gcal",
  maxAge: 10 * 60 * 1000, // 10 minutes
};

// ── Build a per-request OAuth2 client ────────────────────────────────────────
function makeOAuth2Client() {
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GCAL_CALLBACK_URL,
  );
}

// ── Helper: look up doctor_id for the authenticated staff member ─────────────
async function getDoctorId(staffId: string): Promise<string | null> {
  const r = await query<{ id: string }>(
    "SELECT id FROM doctors WHERE staff_id = $1",
    [staffId],
  );
  return r.rows[0]?.id ?? null;
}

// ── Helper: refresh an expired access token ──────────────────────────────────
async function refreshAccessToken(
  doctorId: string,
  refreshToken: string,
): Promise<string> {
  const client = makeOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();

  const newAccessToken = credentials.access_token;
  const newExpiry = credentials.expiry_date
    ? new Date(credentials.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();

  if (!newAccessToken) throw ApiError.internal("Failed to refresh Google Calendar token");

  await query(
    `UPDATE doctor_gcal_tokens
     SET access_token = $1, token_expiry = $2, updated_at = NOW()
     WHERE doctor_id = $3`,
    [newAccessToken, newExpiry, doctorId],
  );

  return newAccessToken;
}

// ── Helper: get a valid access token (refresh if needed) ─────────────────────
async function getValidAccessToken(
  doctorId: string,
): Promise<{ accessToken: string; calendarId: string } | null> {
  const r = await query<{
    access_token: string;
    refresh_token: string;
    token_expiry: string;
    calendar_id: string;
  }>(
    "SELECT access_token, refresh_token, token_expiry, calendar_id FROM doctor_gcal_tokens WHERE doctor_id = $1",
    [doctorId],
  );

  const row = r.rows[0];
  if (!row) return null;

  const expiry = new Date(row.token_expiry).getTime();
  const accessToken =
    expiry - Date.now() < 60_000
      ? await refreshAccessToken(doctorId, row.refresh_token)
      : row.access_token;

  return { accessToken, calendarId: row.calendar_id };
}

// ── 1. Initiate connect ───────────────────────────────────────────────────────
export const initiateConnect = asyncHandler(async (req: Request, res: Response) => {
  // Where to send the user after connecting (e.g. doctor portal /schedule)
  const returnTo =
    typeof req.query.return_to === "string" ? req.query.return_to : null;

  if (!req.user) throw ApiError.unauthorized();

  const client = makeOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh_token to be returned
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events.readonly",
    ],
    state: returnTo ?? "",
  });

  // Store the return_to URL in a short-lived cookie so the callback can use it
  res.cookie(GCAL_STATE_COOKIE, returnTo ?? "", GCAL_COOKIE_OPTS);
  res.redirect(url);
});

// ── 2. OAuth callback ─────────────────────────────────────────────────────────
export const handleCallback = asyncHandler(async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const stateReturnTo = typeof req.query.state === "string" ? req.query.state : null;

  if (!code) throw ApiError.badRequest("Missing OAuth code");
  if (!req.user) throw ApiError.unauthorized();

  const doctorId = await getDoctorId(req.user.sub);
  if (!doctorId) throw ApiError.notFound("Doctor profile not found for this account");

  const client = makeOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw ApiError.badRequest(
      "Google did not return the required tokens. Please disconnect and try again.",
    );
  }

  const expiry = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();

  // Upsert tokens
  await query(
    `INSERT INTO doctor_gcal_tokens (doctor_id, access_token, refresh_token, token_expiry, connected_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (doctor_id) DO UPDATE
       SET access_token  = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           token_expiry  = EXCLUDED.token_expiry,
           updated_at    = NOW()`,
    [doctorId, tokens.access_token, tokens.refresh_token, expiry],
  );

  res.clearCookie(GCAL_STATE_COOKIE, GCAL_COOKIE_OPTS);

  // Redirect back to the doctor portal
  const returnTo = stateReturnTo || env.FRONTEND_URL;
  res.redirect(`${returnTo}?gcal=connected`);
});

// ── 3. Status ─────────────────────────────────────────────────────────────────
export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();

  const doctorId = await getDoctorId(req.user.sub);
  if (!doctorId) {
    ApiResponse.ok(res, { connected: false });
    return;
  }

  const r = await query<{ calendar_id: string; connected_at: string }>(
    "SELECT calendar_id, connected_at FROM doctor_gcal_tokens WHERE doctor_id = $1",
    [doctorId],
  );

  if (!r.rows[0]) {
    ApiResponse.ok(res, { connected: false });
    return;
  }

  ApiResponse.ok(res, {
    connected: true,
    calendar_id: r.rows[0].calendar_id,
    connected_at: r.rows[0].connected_at,
  });
});

// ── 4. Fetch busy events for a date ──────────────────────────────────────────
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();

  const { date } = req.query as Record<string, string>;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw ApiError.badRequest("date query param required (YYYY-MM-DD)");
  }

  const doctorId = await getDoctorId(req.user.sub);
  if (!doctorId) {
    ApiResponse.ok(res, []);
    return;
  }

  const tokenData = await getValidAccessToken(doctorId);
  if (!tokenData) {
    ApiResponse.ok(res, []);
    return;
  }

  const timeMin = encodeURIComponent(`${date}T00:00:00Z`);
  const timeMax = encodeURIComponent(`${date}T23:59:59Z`);
  const calId = encodeURIComponent(tokenData.calendarId);

  const gcalRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events` +
      `?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`,
    {
      headers: { Authorization: `Bearer ${tokenData.accessToken}` },
    },
  );

  if (!gcalRes.ok) {
    const errBody = await gcalRes.json().catch(() => ({}));
    const status = gcalRes.status;
    // 401 means the access token was revoked — clean up
    if (status === 401) {
      await query("DELETE FROM doctor_gcal_tokens WHERE doctor_id = $1", [doctorId]);
    }
    throw new ApiError(status, (errBody as { error?: { message?: string } })?.error?.message ?? "Google Calendar error");
  }

  const body = (await gcalRes.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
      status?: string;
      transparency?: string;
    }>;
  };

  // Only return events that block time (not transparent/free events)
  const events = (body.items ?? [])
    .filter((e) => e.status !== "cancelled" && e.transparency !== "transparent")
    .map((e) => ({
      id: e.id,
      title: e.summary ?? "Busy",
      start: e.start.dateTime ?? e.start.date ?? "",
      end: e.end.dateTime ?? e.end.date ?? "",
      all_day: !e.start.dateTime,
    }));

  ApiResponse.ok(res, events);
});

// ── 5. Disconnect ─────────────────────────────────────────────────────────────
export const disconnect = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();

  const doctorId = await getDoctorId(req.user.sub);
  if (doctorId) {
    await query("DELETE FROM doctor_gcal_tokens WHERE doctor_id = $1", [doctorId]);
  }

  ApiResponse.ok(res, null, "Google Calendar disconnected");
});
