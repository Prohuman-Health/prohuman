import { Request, Response } from "express";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const { branch_id, is_active = "true", include_on_leave } = req.query as Record<string, string>;
  const conditions: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  // Default: return only active doctors (is_active=true); pass is_active=false to list inactive ones
  // include_on_leave=true: include doctors who are on temporary leave (is_active still true on staff)
  if (is_active !== "all") {
    conditions.push(`s.is_active = $${i++}`);
    vals.push(is_active !== "false");
  }

  if (branch_id) { conditions.push(`s.branch_id = $${i++}`); vals.push(branch_id); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT d.id, d.specialty, d.bio,
           s.id AS staff_id, s.full_name, s.email, s.phone, s.branch_id, s.is_active,
           lp.id         AS leave_id,
           lp.from_date  AS leave_from,
           lp.to_date    AS leave_to,
           lp.reason     AS leave_reason,
           (lp.id IS NOT NULL AND CURRENT_DATE BETWEEN lp.from_date AND lp.to_date) AS on_leave
    FROM doctors d
    JOIN staff s ON s.id = d.staff_id
    LEFT JOIN LATERAL (
      SELECT id, from_date, to_date, reason
      FROM doctor_leave_periods
      WHERE doctor_id = d.id
        AND CURRENT_DATE BETWEEN from_date AND to_date
      ORDER BY from_date
      LIMIT 1
    ) lp ON TRUE
    ${where}
    ORDER BY s.full_name
  `;
  const result = await query(sql, vals);
  ApiResponse.ok(res, result.rows);
});

/**
 * GET /doctors/available?date=YYYY-MM-DD[&branch_id=...]
 * Returns only doctors who are NOT on leave on the given date.
 */
export const listAvailableDoctors = asyncHandler(async (req: Request, res: Response) => {
  const { date, branch_id } = req.query as Record<string, string>;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw ApiError.badRequest("date query param is required (YYYY-MM-DD)");
  }
  const conditions: string[] = ["s.is_active = true"];
  const vals: unknown[] = [date];
  let i = 2;
  if (branch_id) { conditions.push(`s.branch_id = $${i++}`); vals.push(branch_id); }
  const where = `WHERE ${conditions.join(" AND ")}`;
  const sql = `
    SELECT d.id, d.specialty, d.bio,
           s.id AS staff_id, s.full_name, s.email, s.phone, s.branch_id, s.is_active,
           FALSE AS on_leave
    FROM doctors d
    JOIN staff s ON s.id = d.staff_id
    ${where}
      AND NOT EXISTS (
        SELECT 1 FROM doctor_leave_periods lp
        WHERE lp.doctor_id = d.id
          AND $1::date BETWEEN lp.from_date AND lp.to_date
      )
    ORDER BY s.full_name
  `;
  const result = await query(sql, vals);
  ApiResponse.ok(res, result.rows);
});

export const getDoctor = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT d.id, d.specialty, d.bio,
            s.id AS staff_id, s.full_name, s.email, s.phone, s.branch_id, s.is_active,
            lp.id         AS leave_id,
            lp.from_date  AS leave_from,
            lp.to_date    AS leave_to,
            lp.reason     AS leave_reason,
            (lp.id IS NOT NULL AND CURRENT_DATE BETWEEN lp.from_date AND lp.to_date) AS on_leave
     FROM doctors d
     JOIN staff s ON s.id = d.staff_id
     LEFT JOIN LATERAL (
       SELECT id, from_date, to_date, reason
       FROM doctor_leave_periods
       WHERE doctor_id = d.id
         AND CURRENT_DATE BETWEEN from_date AND to_date
       ORDER BY from_date
       LIMIT 1
     ) lp ON TRUE
     WHERE d.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Doctor not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const updateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { specialty, bio } = req.body;
  const result = await query(
    `UPDATE doctors SET specialty = COALESCE($1, specialty), bio = COALESCE($2, bio), updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [specialty ?? null, bio ?? null, req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Doctor not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const getDoctorAvailability = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    "SELECT * FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week, start_time",
    [req.params.id]
  );
  ApiResponse.ok(res, result.rows);
});

export const setDoctorAvailability = asyncHandler(async (req: Request, res: Response) => {
  const schedules: Array<{ branch_id: string; day_of_week: number; start_time: string; end_time: string; label?: string; is_active?: boolean }> = req.body;
  await withTransaction(async (client) => {
    await client.query("DELETE FROM doctor_availability WHERE doctor_id = $1", [req.params.id]);
    for (const s of schedules) {
      await client.query(
        `INSERT INTO doctor_availability (doctor_id, branch_id, day_of_week, start_time, end_time, label, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.params.id, s.branch_id, s.day_of_week, s.start_time, s.end_time, s.label ?? null, s.is_active ?? true]
      );
    }
  });
  const result = await query(
    "SELECT * FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week, start_time",
    [req.params.id]
  );
  ApiResponse.ok(res, result.rows);
});

export const addAvailabilitySlot = asyncHandler(async (req: Request, res: Response) => {
  const { branch_id, day_of_week, start_time, end_time, label, is_active } = req.body;
  const result = await query(
    `INSERT INTO doctor_availability (doctor_id, branch_id, day_of_week, start_time, end_time, label, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, branch_id, day_of_week, start_time, end_time, label ?? null, is_active ?? true]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updateAvailabilitySlot = asyncHandler(async (req: Request, res: Response) => {
  const { start_time, end_time, label, is_active } = req.body;
  const result = await query(
    `UPDATE doctor_availability
     SET start_time = COALESCE($1, start_time),
         end_time   = COALESCE($2, end_time),
         label      = COALESCE($3, label),
         is_active  = COALESCE($4, is_active)
     WHERE id = $5 AND doctor_id = $6 RETURNING *`,
    [start_time ?? null, end_time ?? null, label ?? null, is_active ?? null, req.params.avId, req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Availability slot not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const deleteAvailabilitySlot = asyncHandler(async (req: Request, res: Response) => {
  await query("DELETE FROM doctor_availability WHERE id = $1 AND doctor_id = $2", [req.params.avId, req.params.id]);
  ApiResponse.noContent(res);
});

// ── Leave / Inactive Periods ──────────────────────────────────────────────────

export const listLeavePeriods = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT lp.*, s.full_name AS created_by_name
     FROM doctor_leave_periods lp
     LEFT JOIN staff s ON s.id = lp.created_by
     WHERE lp.doctor_id = $1
     ORDER BY lp.from_date DESC`,
    [req.params.id]
  );
  ApiResponse.ok(res, result.rows);
});

export const addLeavePeriod = asyncHandler(async (req: Request, res: Response) => {
  const { from_date, to_date, reason } = req.body;

  // Check for overlapping periods
  const overlap = await query(
    `SELECT id FROM doctor_leave_periods
     WHERE doctor_id = $1
       AND from_date <= $3::date
       AND to_date   >= $2::date`,
    [req.params.id, from_date, to_date]
  );
  if (overlap.rows[0]) {
    throw ApiError.conflict("A leave period already exists that overlaps with the selected dates.");
  }

  const result = await query(
    `INSERT INTO doctor_leave_periods (doctor_id, from_date, to_date, reason, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.id, from_date, to_date, reason ?? null, req.user!.sub]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const deleteLeavePeriod = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    "DELETE FROM doctor_leave_periods WHERE id = $1 AND doctor_id = $2 RETURNING id",
    [req.params.leaveId, req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Leave period not found");
  ApiResponse.noContent(res);
});
