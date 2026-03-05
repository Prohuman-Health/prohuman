import { Request, Response } from "express";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

// Helper: compute points for a payment amount
async function computePoints(amount: number): Promise<number> {
    const setting = await query(
        "SELECT value FROM settings WHERE key = 'points_per_rupee' AND branch_id IS NULL LIMIT 1"
    );
    const rate = parseFloat(setting.rows[0]?.value ?? "0.1"); // default: ₹1 → 0.1 pt
    return Math.floor(amount * rate);
}

// ── Get patient points balance ───────────────────────────────────────────────
export const getPatientBalance = asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
        "SELECT * FROM patient_points_balance WHERE patient_id = $1",
        [req.params.patientId]
    );
    const balance = result.rows[0] ?? { patient_id: req.params.patientId, balance: 0, total_earned: 0, total_redeemed: 0 };
    ApiResponse.ok(res, balance);
});

// ── Get patient points ledger (transaction history) ──────────────────────────
export const getPatientLedger = asyncHandler(async (req: Request, res: Response) => {
    const { page = "1", limit = "50" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await query(
        `SELECT pp.*, sf.full_name AS created_by_name
     FROM patient_points pp
     LEFT JOIN staff sf ON sf.id = pp.created_by
     WHERE pp.patient_id = $1
     ORDER BY pp.created_at DESC
     LIMIT $2 OFFSET $3`,
        [req.params.patientId, parseInt(limit), offset]
    );
    ApiResponse.ok(res, result.rows);
});

// ── Award points on session payment (called from billing/sessions) ───────────
export const awardSessionPoints = asyncHandler(async (req: Request, res: Response) => {
    const { patient_id, session_id, amount_paid } = req.body;
    if (!patient_id || !amount_paid) throw ApiError.badRequest("patient_id and amount_paid required");

    const pts = await computePoints(parseFloat(amount_paid));
    if (pts <= 0) return ApiResponse.ok(res, { points_awarded: 0 }, "No points awarded for this amount");

    const result = await query(
        `INSERT INTO patient_points (patient_id, event_type, points, session_id, note, created_by)
     VALUES ($1,'session_payment',$2,$3,$4,$5) RETURNING *`,
        [patient_id, pts, session_id ?? null, `Earned for ₹${amount_paid} payment`, req.user!.sub]
    );

    // Check if balance now meets redemption threshold → auto-notify (via WhatsApp later)
    const balanceRow = await query(
        "SELECT balance FROM patient_points_balance WHERE patient_id = $1",
        [patient_id]
    );
    const threshold = await query(
        "SELECT value FROM settings WHERE key = 'points_redemption_threshold' AND branch_id IS NULL LIMIT 1"
    );
    const thresh = parseInt(threshold.rows[0]?.value ?? "2000");
    const currentBalance = parseInt(balanceRow.rows[0]?.balance ?? "0");

    ApiResponse.created(res, {
        ...result.rows[0],
        current_balance: currentBalance,
        redeemable: currentBalance >= thresh
    }, `${pts} points awarded`);
});

// ── Award referral points ────────────────────────────────────────────────────
export const awardReferralPoints = asyncHandler(async (req: Request, res: Response) => {
    const { referrer_patient_id, referral_id } = req.body;
    if (!referrer_patient_id) throw ApiError.badRequest("referrer_patient_id required");

    // Default 200 pts for referral, or from settings
    const setting = await query(
        "SELECT value FROM settings WHERE key = 'referral_points' AND branch_id IS NULL LIMIT 1"
    );
    const pts = parseInt(setting.rows[0]?.value ?? "200");

    const existing = await query(
        "SELECT id FROM patient_points WHERE referral_id = $1 AND event_type = 'referral_bonus'",
        [referral_id]
    );
    if (existing.rows[0]) return ApiResponse.ok(res, null, "Referral points already awarded");

    const result = await query(
        `INSERT INTO patient_points (patient_id, event_type, points, referral_id, note, created_by)
     VALUES ($1,'referral_bonus',$2,$3,'Referral bonus — new patient completed first session',$4) RETURNING *`,
        [referrer_patient_id, pts, referral_id ?? null, req.user!.sub]
    );
    ApiResponse.created(res, result.rows[0], `${pts} referral points awarded`);
});

// ── Redeem points ────────────────────────────────────────────────────────────
export const redeemPoints = asyncHandler(async (req: Request, res: Response) => {
    const { patient_id, points, session_id, note } = req.body;
    if (!patient_id || !points) throw ApiError.badRequest("patient_id and points required");

    const result = await withTransaction(async (client) => {
        const balRow = await client.query(
            "SELECT balance FROM patient_points_balance WHERE patient_id = $1",
            [patient_id]
        );
        const balance = parseInt(balRow.rows[0]?.balance ?? "0");
        if (balance < points) throw ApiError.badRequest(`Insufficient points. Balance: ${balance}, requested: ${points}`);

        const row = await client.query(
            `INSERT INTO patient_points (patient_id, event_type, points, session_id, note, created_by)
       VALUES ($1,'redeemed',$2,$3,$4,$5) RETURNING *`,
            [patient_id, -Math.abs(points), session_id ?? null, note ?? "Points redeemed", req.user!.sub]
        );
        return row.rows[0];
    });
    ApiResponse.created(res, result, "Points redeemed successfully");
});

// ── Manual adjustment (admin only) ──────────────────────────────────────────
export const adjustPoints = asyncHandler(async (req: Request, res: Response) => {
    const { patient_id, points, note } = req.body;
    if (!patient_id || points === undefined) throw ApiError.badRequest("patient_id and points required");

    const result = await query(
        `INSERT INTO patient_points (patient_id, event_type, points, note, created_by)
     VALUES ($1,'adjustment',$2,$3,$4) RETURNING *`,
        [patient_id, points, note ?? "Manual admin adjustment", req.user!.sub]
    );
    ApiResponse.created(res, result.rows[0]);
});
