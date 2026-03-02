import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const result = await query("SELECT * FROM consent_templates ORDER BY title");
  ApiResponse.ok(res, result.rows);
});

export const getTemplate = asyncHandler(async (req: Request, res: Response) => {
  const result = await query("SELECT * FROM consent_templates WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) throw ApiError.notFound("Template not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { title, content, is_active } = req.body;
  const result = await query(
    "INSERT INTO consent_templates (title, content, is_active) VALUES ($1,$2,$3) RETURNING *",
    [title, content, is_active ?? true]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { title, content, is_active } = req.body;
  const result = await query(
    `UPDATE consent_templates
     SET title = COALESCE($1, title), content = COALESCE($2, content),
         is_active = COALESCE($3, is_active), updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [title ?? null, content ?? null, is_active ?? null, req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Template not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const listConsentRecords = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id } = req.query as Record<string, string>;
  const result = await query(
    `SELECT cr.*, ct.title AS template_title
     FROM consent_records cr JOIN consent_templates ct ON ct.id = cr.template_id
     WHERE cr.patient_id = $1 ORDER BY cr.signed_at DESC`,
    [patient_id]
  );
  ApiResponse.ok(res, result.rows);
});

export const signConsent = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, template_id, signature_data } = req.body;
  const result = await query(
    "INSERT INTO consent_records (patient_id, template_id, signature_data) VALUES ($1,$2,$3) RETURNING *",
    [patient_id, template_id, signature_data ?? null]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const getConsentRecord = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT cr.*, ct.title AS template_title, ct.content
     FROM consent_records cr JOIN consent_templates ct ON ct.id = cr.template_id
     WHERE cr.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Consent record not found");
  ApiResponse.ok(res, result.rows[0]);
});
