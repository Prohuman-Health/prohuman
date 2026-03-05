import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

// ── List all WhatsApp templates ────────────────────────────────────────────
export const listWhatsappTemplates = asyncHandler(async (_req: Request, res: Response) => {
    const result = await query(
        `SELECT wt.*, sf.full_name AS updated_by_name
     FROM whatsapp_templates wt
     LEFT JOIN staff sf ON sf.id = wt.updated_by
     ORDER BY wt.trigger ASC`
    );
    ApiResponse.ok(res, result.rows);
});

// ── Get single template ─────────────────────────────────────────────────────
export const getWhatsappTemplate = asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
        `SELECT wt.*, sf.full_name AS updated_by_name
     FROM whatsapp_templates wt
     LEFT JOIN staff sf ON sf.id = wt.updated_by
     WHERE wt.id = $1`,
        [req.params.id]
    );
    if (!result.rows[0]) throw ApiError.notFound("Template not found");
    ApiResponse.ok(res, result.rows[0]);
});

// ── Get template by trigger type ────────────────────────────────────────────
export const getTemplateByTrigger = asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
        "SELECT * FROM whatsapp_templates WHERE trigger = $1",
        [req.params.trigger]
    );
    if (!result.rows[0]) throw ApiError.notFound("Template not found for trigger");
    ApiResponse.ok(res, result.rows[0]);
});

// ── Update template body/name/active ───────────────────────────────────────
export const updateWhatsappTemplate = asyncHandler(async (req: Request, res: Response) => {
    const existing = await query("SELECT id FROM whatsapp_templates WHERE id = $1", [req.params.id]);
    if (!existing.rows[0]) throw ApiError.notFound("Template not found");

    const { name, body, is_active } = req.body;
    if (!name && !body && is_active === undefined) throw ApiError.badRequest("No fields to update");

    const result = await query(
        `UPDATE whatsapp_templates SET
       name       = COALESCE($1, name),
       body       = COALESCE($2, body),
       is_active  = COALESCE($3, is_active),
       updated_by = $4,
       updated_at = NOW()
     WHERE id = $5 RETURNING *`,
        [name ?? null, body ?? null, is_active ?? null, req.user!.sub, req.params.id]
    );
    ApiResponse.ok(res, result.rows[0]);
});

// ── Preview a template with sample data ────────────────────────────────────
export const previewTemplate = asyncHandler(async (req: Request, res: Response) => {
    const result = await query("SELECT body FROM whatsapp_templates WHERE id = $1", [req.params.id]);
    if (!result.rows[0]) throw ApiError.notFound("Template not found");

    const variables: Record<string, string> = req.body ?? {};
    let preview = result.rows[0].body as string;
    for (const [key, val] of Object.entries(variables)) {
        preview = preview.replaceAll(`{{${key}}}`, val);
    }
    ApiResponse.ok(res, { preview });
});

// ── Bulk toggle active status ───────────────────────────────────────────────
export const toggleTemplateActive = asyncHandler(async (req: Request, res: Response) => {
    const { ids, is_active } = req.body as { ids: string[]; is_active: boolean };
    if (!ids?.length) throw ApiError.badRequest("ids array required");
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    await query(
        `UPDATE whatsapp_templates SET is_active = $${ids.length + 1}, updated_at = NOW()
     WHERE id IN (${placeholders})`,
        [...ids, is_active]
    );
    ApiResponse.ok(res, null, `${ids.length} template(s) updated`);
});
