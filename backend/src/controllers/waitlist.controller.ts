import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const { branch_id, status = "waiting" } = req.query as Record<string, string>;
  const conditions = [`w.status = $1`]; const vals: unknown[] = [status]; let i = 2;
  if (branch_id) { conditions.push(`w.branch_id = $${i++}`); vals.push(branch_id); }
  const result = await query(
    `SELECT w.*, p.full_name AS patient_name, p.phone,
            sf.full_name AS preferred_doctor_name, st.name AS session_type_name
     FROM waitlist w
     JOIN patients p ON p.id = w.patient_id
     LEFT JOIN doctors d ON d.id = w.doctor_id
     LEFT JOIN staff sf  ON sf.id = d.staff_id
     LEFT JOIN session_types st ON st.id = w.session_type_id
     WHERE ${conditions.join(" AND ")} ORDER BY w.created_at`,
    vals
  );
  ApiResponse.ok(res, result.rows);
});

export const getWaitlistEntry = asyncHandler(async (req: Request, res: Response) => {
  const result = await query("SELECT * FROM waitlist WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) throw ApiError.notFound("Waitlist entry not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const addToWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, doctor_id, branch_id, session_type_id, preferred_dates, notes } = req.body;
  const result = await query(
    `INSERT INTO waitlist (patient_id, doctor_id, branch_id, session_type_id, preferred_dates, notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [patient_id, doctor_id ?? null, branch_id, session_type_id ?? null,
     preferred_dates ? JSON.stringify(preferred_dates) : null, notes ?? null]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updateWaitlistEntry = asyncHandler(async (req: Request, res: Response) => {
  const allowed = ["doctor_id","session_type_id","preferred_dates","status","notes"];
  const sets: string[] = []; const vals: unknown[] = []; let i = 1;
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) { sets.push(`${k} = $${i++}`); vals.push(k === "preferred_dates" ? JSON.stringify(v) : v); }
  }
  if (!sets.length) throw ApiError.badRequest("Nothing to update");
  vals.push(req.params.id);
  const result = await query(
    `UPDATE waitlist SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
    vals
  );
  if (!result.rows[0]) throw ApiError.notFound("Entry not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const removeFromWaitlist = asyncHandler(async (req: Request, res: Response) => {
  await query("DELETE FROM waitlist WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});

export const notifyWaitlistPatient = asyncHandler(async (req: Request, res: Response) => {
  await query("UPDATE waitlist SET status = 'notified', updated_at = NOW() WHERE id = $1", [req.params.id]);
  // TODO: dispatch actual notification via notification service
  ApiResponse.ok(res, null, "Patient notified");
});
