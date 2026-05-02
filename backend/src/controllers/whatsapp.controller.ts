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

type ReminderSafetyConfig = {
    enableSend: boolean;
    maxRecipients: number;
    cooldownMinutes: number;
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

function parseBoolValue(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
    if (typeof value === "number") return value === 1;
    return fallback;
}

function parsePositiveIntValue(value: unknown, fallback: number): number {
    if (typeof value === "number") return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
    if (typeof value === "string") {
        const parsed = Number.parseInt(value.trim(), 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }
    return fallback;
}

async function getReminderSafetyConfig(): Promise<ReminderSafetyConfig> {
    const keys = [
        "WHATSAPP_ENABLE_REMINDER_SEND",
        "WHATSAPP_MAX_REMINDER_RECIPIENTS",
        "WHATSAPP_REMINDER_COOLDOWN_MINUTES",
    ];

    const settingResult = await query(
        `SELECT key, value FROM settings WHERE branch_id IS NULL AND key = ANY($1::text[])`,
        [keys]
    );

    const map = new Map<string, unknown>();
    for (const row of settingResult.rows) map.set(row.key as string, row.value);

    return {
        enableSend: parseBoolValue(
            map.get("WHATSAPP_ENABLE_REMINDER_SEND"),
            env.WHATSAPP_ENABLE_REMINDER_SEND
        ),
        maxRecipients: parsePositiveIntValue(
            map.get("WHATSAPP_MAX_REMINDER_RECIPIENTS"),
            env.WHATSAPP_MAX_REMINDER_RECIPIENTS
        ),
        cooldownMinutes: parsePositiveIntValue(
            map.get("WHATSAPP_REMINDER_COOLDOWN_MINUTES"),
            env.WHATSAPP_REMINDER_COOLDOWN_MINUTES
        ),
    };
}

async function dispatchReminderMessages(message: string, recipients: string[], enableSend: boolean): Promise<ReminderDispatchResult[]> {
    if (!enableSend) {
        return recipients.map((recipient) => ({
            recipient,
            ok: true,
            error: "sending-disabled-dry-run",
        }));
    }

    const results: ReminderDispatchResult[] = [];
    for (const recipient of recipients) {
        try {
            await whatsappAuth.sendTextMessage(recipient, message);
            results.push({ recipient, ok: true });
        } catch (err) {
            results.push({
                recipient,
                ok: false,
                error: err instanceof Error ? err.message : "send-failed",
            });
        }
    }
    return results;
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
    const cfg = await getReminderSafetyConfig();

    if (!message?.trim()) throw ApiError.badRequest("message is required");
    if (!Array.isArray(recipients) || recipients.length === 0) {
        throw ApiError.badRequest("recipients array is required");
    }

    const maxRecipients = cfg.maxRecipients;
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

    const now = Date.now();
    const cooldownMs = cfg.cooldownMinutes * 60 * 1000;
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

    const dispatchResults = await dispatchReminderMessages(message.trim(), cooledRecipients, cfg.enableSend);
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
            mode: cfg.enableSend ? "live" : "dry-run",
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
