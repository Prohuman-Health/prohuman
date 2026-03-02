import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

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
