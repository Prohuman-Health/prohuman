import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

// ── Activity / Audit Log ─────────────────────────────────────────────────────

// List audit log with filters (admin only)
export const listActivityLog = asyncHandler(async (req: Request, res: Response) => {
    const {
        staff_id, patient_id, resource, action,
        from, to, page = "1", limit = "100"
    } = req.query as Record<string, string>;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"]; const vals: unknown[] = []; let i = 1;

    if (staff_id) { conditions.push(`al.staff_id = $${i++}`); vals.push(staff_id); }
    if (patient_id) { conditions.push(`al.patient_id = $${i++}`); vals.push(patient_id); }
    if (resource) { conditions.push(`al.resource = $${i++}`); vals.push(resource); }
    if (action) { conditions.push(`al.action = $${i++}`); vals.push(action); }
    if (from) { conditions.push(`al.created_at >= $${i++}`); vals.push(from); }
    if (to) { conditions.push(`al.created_at <= $${i++}`); vals.push(to); }

    vals.push(parseInt(limit), offset);
    const result = await query(
        `SELECT al.*, sf.full_name AS staff_name, sf.role AS staff_role,
            p.full_name AS patient_name, p.patient_code,
            COUNT(*) OVER() AS total_count
     FROM activity_log al
     JOIN staff sf ON sf.id = al.staff_id
     LEFT JOIN patients p ON p.id = al.patient_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY al.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
        vals
    );
    const total = result.rows[0]?.total_count ?? 0;
    ApiResponse.ok(res, { logs: result.rows, total: parseInt(total), page: parseInt(page) });
});

// ── Staff Form Access Control ────────────────────────────────────────────────

// Get which forms a staff member can access
export const getStaffFormAccess = asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
        `SELECT sfa.*, f.name AS form_name, gb.full_name AS granted_by_name
     FROM staff_form_access sfa
     JOIN forms f ON f.id = sfa.form_id
     LEFT JOIN staff gb ON gb.id = sfa.granted_by
     WHERE sfa.staff_id = $1
     ORDER BY f.name`,
        [req.params.staffId]
    );
    ApiResponse.ok(res, result.rows);
});

// Grant form access to a staff member
export const grantFormAccess = asyncHandler(async (req: Request, res: Response) => {
    const { form_id, granted } = req.body;
    if (!form_id) throw ApiError.badRequest("form_id required");

    await query(
        `INSERT INTO staff_form_access (staff_id, form_id, granted, granted_by)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (staff_id, form_id) DO UPDATE
     SET granted = EXCLUDED.granted, granted_by = EXCLUDED.granted_by`,
        [req.params.staffId, form_id, granted ?? true, req.user!.sub]
    );
    ApiResponse.ok(res, null, "Form access updated");
});

// Batch update form access for a staff member
export const batchUpdateFormAccess = asyncHandler(async (req: Request, res: Response) => {
    const entries: Array<{ form_id: string; granted: boolean }> = req.body;
    if (!Array.isArray(entries) || !entries.length) throw ApiError.badRequest("Array of {form_id, granted} required");

    for (const entry of entries) {
        await query(
            `INSERT INTO staff_form_access (staff_id, form_id, granted, granted_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (staff_id, form_id) DO UPDATE
       SET granted = EXCLUDED.granted, granted_by = EXCLUDED.granted_by`,
            [req.params.staffId, entry.form_id, entry.granted, req.user!.sub]
        );
    }
    ApiResponse.ok(res, null, `${entries.length} form access entries updated`);
});

// ── Access validation helpers (used by other controllers / middleware) ────────

// Check if a staff member can access a specific patient
// (calendar-based OR history-based)
export const checkPatientAccess = asyncHandler(async (req: Request, res: Response) => {
    const { staff_id, patient_id } = req.query as Record<string, string>;
    if (!staff_id || !patient_id) throw ApiError.badRequest("staff_id and patient_id required");

    const access = await canStaffAccessPatient(staff_id, patient_id);
    ApiResponse.ok(res, { has_access: access.granted, reason: access.reason });
});

export async function canStaffAccessPatient(
    staffId: string, patientId: string
): Promise<{ granted: boolean; reason: string }> {
    // Admin / receptionist always have access
    const staffRow = await query("SELECT role FROM staff WHERE id = $1", [staffId]);
    const role = staffRow.rows[0]?.role;
    if (!role) return { granted: false, reason: "Staff not found" };
    if (["admin", "receptionist", "manager"].includes(role)) {
        return { granted: true, reason: "role_based" };
    }

    // Calendar-based: patient has a session with this doctor today (±7 days window)
    const calRow = await query(
        `SELECT s.id FROM sessions s
     JOIN doctors d ON d.id = s.doctor_id AND d.staff_id = $1
     WHERE s.patient_id = $2
       AND s.scheduled_at >= NOW() - INTERVAL '1 day'
       AND s.scheduled_at <= NOW() + INTERVAL '7 days'
       AND s.status NOT IN ('cancelled')
     LIMIT 1`,
        [staffId, patientId]
    );
    if (calRow.rows[0]) return { granted: true, reason: "calendar_based" };

    // History-based: staff has treated this patient at least once
    const histRow = await query(
        `SELECT s.id FROM sessions s
     JOIN doctors d ON d.id = s.doctor_id AND d.staff_id = $1
     WHERE s.patient_id = $2 AND s.status = 'completed'
     LIMIT 1`,
        [staffId, patientId]
    );
    if (histRow.rows[0]) return { granted: true, reason: "history_based" };

    return { granted: false, reason: "no_access" };
}
