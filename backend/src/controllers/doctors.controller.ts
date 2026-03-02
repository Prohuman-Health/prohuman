import { Request, Response } from "express";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const { branch_id } = req.query as Record<string, string>;
  let sql = `
    SELECT d.id, d.specialty, d.bio,
           s.id AS staff_id, s.full_name, s.email, s.phone, s.is_active
    FROM doctors d
    JOIN staff s ON s.id = d.staff_id
  `;
  const vals: unknown[] = [];
  if (branch_id) { sql += " WHERE s.branch_id = $1"; vals.push(branch_id); }
  sql += " ORDER BY s.full_name";
  const result = await query(sql, vals);
  ApiResponse.ok(res, result.rows);
});

export const getDoctor = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT d.id, d.specialty, d.bio,
            s.id AS staff_id, s.full_name, s.email, s.phone, s.branch_id, s.is_active
     FROM doctors d JOIN staff s ON s.id = d.staff_id WHERE d.id = $1`,
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
  const schedules: Array<{ branch_id: string; day_of_week: number; start_time: string; end_time: string; is_active?: boolean }> = req.body;
  await withTransaction(async (client) => {
    await client.query("DELETE FROM doctor_availability WHERE doctor_id = $1", [req.params.id]);
    for (const s of schedules) {
      await client.query(
        `INSERT INTO doctor_availability (doctor_id, branch_id, day_of_week, start_time, end_time, is_active)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [req.params.id, s.branch_id, s.day_of_week, s.start_time, s.end_time, s.is_active ?? true]
      );
    }
  });
  const result = await query(
    "SELECT * FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week",
    [req.params.id]
  );
  ApiResponse.ok(res, result.rows);
});

export const updateAvailabilitySlot = asyncHandler(async (req: Request, res: Response) => {
  const { start_time, end_time, is_active } = req.body;
  const result = await query(
    `UPDATE doctor_availability
     SET start_time = COALESCE($1, start_time),
         end_time   = COALESCE($2, end_time),
         is_active  = COALESCE($3, is_active)
     WHERE id = $4 AND doctor_id = $5 RETURNING *`,
    [start_time ?? null, end_time ?? null, is_active ?? null, req.params.avId, req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Availability slot not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const deleteAvailabilitySlot = asyncHandler(async (req: Request, res: Response) => {
  await query("DELETE FROM doctor_availability WHERE id = $1 AND doctor_id = $2", [req.params.avId, req.params.id]);
  ApiResponse.noContent(res);
});
