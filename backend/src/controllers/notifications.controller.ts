import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

// ── Notification templates ─────────────────────────────────────────────────────
export const listNotificationTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const result = await query("SELECT * FROM notification_templates ORDER BY trigger, channel");
  ApiResponse.ok(res, result.rows);
});

export const getNotificationTemplate = asyncHandler(async (req: Request, res: Response) => {
  const result = await query("SELECT * FROM notification_templates WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) throw ApiError.notFound("Template not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const updateNotificationTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { subject, body, is_active } = req.body;
  const result = await query(
    `UPDATE notification_templates
     SET subject = COALESCE($1, subject), body = COALESCE($2, body),
         is_active = COALESCE($3, is_active), updated_by = $4, updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [subject ?? null, body ?? null, is_active ?? null, req.user!.sub, req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Template not found");
  ApiResponse.ok(res, result.rows[0]);
});

/** Render a notification template with sample data so admin can preview before saving */
export const previewNotificationTemplate = asyncHandler(async (req: Request, res: Response) => {
  const result = await query("SELECT * FROM notification_templates WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) throw ApiError.notFound("Template not found");

  const sampleVars: Record<string, string> = {
    patient_name:  "Aisha Mehta",
    doctor_name:   "Dr. Priya Sharma",
    session_date:  "2026-03-01",
    session_time:  "10:00 AM",
    session_type:  "Initial Evaluation",
    branch_name:   "ProHuman Main Clinic",
    clinic_name:   "ProHuman Health",
    cancel_reason: "Doctor unavailable",
    amount:        "₹1,500",
    consent_link:  "https://prohuman.health/consent/abc123",
  };

  const rendered = Object.entries(sampleVars).reduce(
    (tmpl, [k, v]) => tmpl.replaceAll(`{{${k}}}`, v),
    result.rows[0].body as string
  );

  ApiResponse.ok(res, {
    subject: result.rows[0].subject,
    body_preview: rendered,
    sample_vars: sampleVars,
  });
});

// ── In-app notification inbox ─────────────────────────────────────────────────
// MAIL types: appointment_request
// BELL types: everything else

const MAIL_TYPES = ["appointment_request"];

/**
 * GET /notifications/inbox
 * Query params: type = "mail" | "notifications" | "all"  (default "all")
 *               page, limit
 */
export const listInbox = asyncHandler(async (req: Request, res: Response) => {
  const { type = "all", page = "1", limit = "30" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let typeFilter = "";
  const vals: unknown[] = [parseInt(limit), offset];

  if (type === "mail") {
    typeFilter = `WHERE n.type = ANY($3::text[])`;
    vals.push(MAIL_TYPES);
  } else if (type === "notifications") {
    typeFilter = `WHERE n.type != ALL($3::text[])`;
    vals.push(MAIL_TYPES);
  }

  const result = await query(
    `SELECT * FROM in_app_notifications n ${typeFilter} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    vals
  );
  ApiResponse.ok(res, result.rows);
});

/**
 * GET /notifications/inbox/counts
 * Returns { mail: number, notifications: number } for badge display
 */
export const getUnreadCounts = asyncHandler(async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT
       SUM(CASE WHEN type = ANY($1::text[]) AND NOT is_read THEN 1 ELSE 0 END)::int AS mail,
       SUM(CASE WHEN type != ALL($1::text[]) AND NOT is_read THEN 1 ELSE 0 END)::int AS notifications
     FROM in_app_notifications`,
    [MAIL_TYPES]
  );
  ApiResponse.ok(res, result.rows[0] ?? { mail: 0, notifications: 0 });
});

/**
 * PATCH /notifications/inbox/:id/read
 */
export const markOneRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    "UPDATE in_app_notifications SET is_read = TRUE WHERE id = $1 RETURNING id",
    [req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Notification not found");
  ApiResponse.ok(res, null);
});

/**
 * PATCH /notifications/inbox/read-all
 * Query param: type = "mail" | "notifications" | "all"
 */
export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const { type = "all" } = req.query as Record<string, string>;

  if (type === "mail") {
    await query("UPDATE in_app_notifications SET is_read = TRUE WHERE type = ANY($1::text[])", [MAIL_TYPES]);
  } else if (type === "notifications") {
    await query("UPDATE in_app_notifications SET is_read = TRUE WHERE type != ALL($1::text[])", [MAIL_TYPES]);
  } else {
    await query("UPDATE in_app_notifications SET is_read = TRUE", []);
  }
  ApiResponse.ok(res, null);
});

