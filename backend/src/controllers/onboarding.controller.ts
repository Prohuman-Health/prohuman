import { Request, Response } from "express";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";

/**
 * GET /onboarding/status
 * Returns whether full onboarding is complete and the first branch (if any).
 */
export const getStatus = asyncHandler(async (_req: Request, res: Response) => {
    const setting = await query(
        "SELECT value FROM settings WHERE key = 'onboarding_completed' AND branch_id IS NULL",
        []
    );
    const branch = await query("SELECT * FROM branches WHERE is_active = TRUE LIMIT 1", []);
    const sessionTypes = await query("SELECT COUNT(*) FROM session_types WHERE is_active = TRUE", []);

    ApiResponse.ok(res, {
        completed: setting.rows[0]?.value === true || setting.rows[0]?.value === "true",
        has_branch: branch.rows.length > 0,
        branch: branch.rows[0] ?? null,
        session_type_count: parseInt(sessionTypes.rows[0]?.count ?? "0", 10),
    });
});

/**
 * POST /onboarding/complete
 * Body: { clinic, branch, session_types[] }
 * Atomically creates the branch, session types, and marks onboarding complete.
 */
export const complete = asyncHandler(async (req: Request, res: Response) => {
    const {
        clinic,     // { name, timezone }
        branch,     // { address, phone, email, operating_hours }
        session_types = [], // [{ name, description, duration_minutes, fee }]
    } = req.body;

    await withTransaction(async (client) => {
        // 1. Create the main branch
        const branchResult = await client.query(
            `INSERT INTO branches (name, address, phone, email, operating_hours)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [
                clinic.name,
                branch.address,
                branch.phone ?? null,
                branch.email ?? null,
                JSON.stringify(branch.operating_hours ?? {}),
            ]
        );
        const branchId = branchResult.rows[0].id;

        // 2. Update clinic-level settings
        const settingsUpsert = [
            ["clinic_name", JSON.stringify(clinic.name)],
            ["clinic_timezone", JSON.stringify(clinic.timezone ?? "Asia/Kolkata")],
        ];
        for (const [key, value] of settingsUpsert) {
            await client.query(
                `INSERT INTO settings (key, value, branch_id)
         VALUES ($1, $2::jsonb, NULL)
         ON CONFLICT (key) WHERE branch_id IS NULL
         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                [key, value]
            );
        }

        // 3. Assign the new branch to the current staff member
        await client.query(
            "UPDATE staff SET branch_id = $1, updated_at = NOW() WHERE id = $2",
            [branchId, req.user!.sub]
        );

        // 4. Create session types
        for (const st of session_types) {
            await client.query(
                `INSERT INTO session_types (name, description, default_duration_minutes, fee)
         VALUES ($1, $2, $3, $4)`,
                [st.name, st.description ?? null, st.duration_minutes ?? 60, st.fee ?? 0]
            );
        }

        // 5. Mark onboarding as complete
        await client.query(
            `INSERT INTO settings (key, value, branch_id)
       VALUES ('onboarding_completed', 'true', NULL)
       ON CONFLICT (key) WHERE branch_id IS NULL
       DO UPDATE SET value = 'true', updated_at = NOW()`
        );
    });

    ApiResponse.ok(res, null, "Onboarding complete");
});
