import { Request, Response } from "express";
import crypto from "crypto";
import { query } from "../config/db";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { whatsappAuth } from "../utils/whatsappAuth";

type ReminderSendRequest = {
    message: string;
    recipients: string[];
};

type ReminderDispatchResult = {
    recipient: string;
    ok: boolean;
    error?: string;
};

// In-memory cooldown state to reduce accidental repeat sends.
const reminderCooldown = new Map<string, number>();

function normalizePhone(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return "";
    const noSpaces = trimmed.replace(/[\s\-()]/g, "");
    if (!/^\+?[1-9]\d{7,14}$/.test(noSpaces)) return "";
    return noSpaces.startsWith("+") ? noSpaces : `+${noSpaces}`;
}

function reminderKey(recipient: string, message: string): string {
    const digest = crypto.createHash("sha256").update(message).digest("hex").slice(0, 16);
    return `${recipient}:${digest}`;
}

async function dispatchReminderMessages(message: string, recipients: string[]): Promise<ReminderDispatchResult[]> {
    if (!env.WHATSAPP_ENABLE_REMINDER_SEND) {
        return recipients.map((recipient) => ({
            recipient,
            ok: true,
            error: "sending-disabled-dry-run",
        }));
    }

    // Placeholder for WhatsApp provider integration (Baileys/Twilio/etc).
    // Keeping this explicit avoids accidental sends before provider setup.
    return recipients.map((recipient) => ({
        recipient,
        ok: false,
        error: "provider-not-configured",
    }));
}

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

// ── Send tightly-scoped project reminders ───────────────────────────────────
export const sendProjectReminder = asyncHandler(async (req: Request, res: Response) => {
    const { message, recipients } = req.body as ReminderSendRequest;

    if (!message?.trim()) throw ApiError.badRequest("message is required");
    if (!Array.isArray(recipients) || recipients.length === 0) {
        throw ApiError.badRequest("recipients array is required");
    }

    const maxRecipients = env.WHATSAPP_MAX_REMINDER_RECIPIENTS;
    if (recipients.length > maxRecipients) {
        throw ApiError.badRequest(`Maximum ${maxRecipients} recipients allowed per reminder`);
    }

    const normalizedRecipients = recipients
        .map((raw) => normalizePhone(raw))
        .filter((phone) => phone.length > 0);

    if (normalizedRecipients.length !== recipients.length) {
        throw ApiError.badRequest("All recipients must be valid phone numbers in E.164 format");
    }

    const uniqueRecipients = [...new Set(normalizedRecipients)];

    const allowedSet = new Set(env.WHATSAPP_ALLOWED_REMINDER_NUMBERS);
    if (allowedSet.size === 0) {
        throw ApiError.badRequest("No allowed reminder recipients configured in server env");
    }

    const blockedRecipients = uniqueRecipients.filter((r) => !allowedSet.has(r));
    if (blockedRecipients.length > 0) {
        throw ApiError.forbidden(`Recipient(s) not in allowlist: ${blockedRecipients.join(", ")}`);
    }

    const now = Date.now();
    const cooldownMs = env.WHATSAPP_REMINDER_COOLDOWN_MINUTES * 60 * 1000;
    const cooledRecipients: string[] = [];
    const inCooldown: string[] = [];

    for (const recipient of uniqueRecipients) {
        const key = reminderKey(recipient, message);
        const lastSentAt = reminderCooldown.get(key) ?? 0;
        if (now - lastSentAt < cooldownMs) inCooldown.push(recipient);
        else cooledRecipients.push(recipient);
    }

    if (cooledRecipients.length === 0) {
        throw ApiError.badRequest("All recipients are currently in cooldown for this reminder message");
    }

    const dispatchResults = await dispatchReminderMessages(message.trim(), cooledRecipients);
    for (const result of dispatchResults) {
        if (result.ok) {
            reminderCooldown.set(reminderKey(result.recipient, message.trim()), now);
        }
    }

    const sentCount = dispatchResults.filter((r) => r.ok).length;
    const failed = dispatchResults.filter((r) => !r.ok);

    ApiResponse.ok(
        res,
        {
            requested_count: uniqueRecipients.length,
            attempted_count: cooledRecipients.length,
            sent_count: sentCount,
            skipped_cooldown: inCooldown,
            failed,
            mode: env.WHATSAPP_ENABLE_REMINDER_SEND ? "live" : "dry-run",
        },
        sentCount > 0 ? "Reminder dispatch processed" : "No reminders sent"
    );
});

// ── WhatsApp QR auth endpoints ──────────────────────────────────────────────
export const getWhatsappAuthStatus = asyncHandler(async (_req: Request, res: Response) => {
    const status = whatsappAuth.getStatus();
    ApiResponse.ok(res, status);
});

export const generateWhatsappQr = asyncHandler(async (_req: Request, res: Response) => {
    const status = await whatsappAuth.generateQr();
    ApiResponse.ok(res, status, "QR status refreshed");
});

export const logoutWhatsappAuth = asyncHandler(async (_req: Request, res: Response) => {
    await whatsappAuth.logout();
    ApiResponse.ok(res, { logged_out: true }, "WhatsApp session logged out");
});
