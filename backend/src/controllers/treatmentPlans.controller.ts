import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listPlans = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, doctor_id, status } = req.query as Record<string, string>;
  const conditions = ["1=1"]; const vals: unknown[] = []; let i = 1;
  if (patient_id) { conditions.push(`tp.patient_id = $${i++}`); vals.push(patient_id); }
  if (doctor_id)  { conditions.push(`tp.doctor_id = $${i++}`);  vals.push(doctor_id); }
  if (status)     { conditions.push(`tp.status = $${i++}`);     vals.push(status); }
  const result = await query(
    `SELECT tp.*, p.full_name AS patient_name, sf.full_name AS doctor_name
     FROM treatment_plans tp
     JOIN patients p ON p.id = tp.patient_id
     JOIN doctors d  ON d.id = tp.doctor_id
     JOIN staff sf   ON sf.id = d.staff_id
     WHERE ${conditions.join(" AND ")} ORDER BY tp.start_date DESC`,
    vals
  );
  ApiResponse.ok(res, result.rows);
});

export const getPlan = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT tp.*, p.full_name AS patient_name, sf.full_name AS doctor_name
     FROM treatment_plans tp
     JOIN patients p ON p.id = tp.patient_id
     JOIN doctors d  ON d.id = tp.doctor_id
     JOIN staff sf   ON sf.id = d.staff_id
     WHERE tp.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Treatment plan not found");

  const sessions = await query(
    `SELECT s.id, s.scheduled_at, s.status, s.attendance, st.name AS session_type
     FROM sessions s JOIN session_types st ON st.id = s.session_type_id
     WHERE s.treatment_plan_id = $1 ORDER BY s.scheduled_at`,
    [req.params.id]
  );
  ApiResponse.ok(res, { ...result.rows[0], sessions: sessions.rows });
});

export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, doctor_id, goal, planned_sessions, start_date, target_end_date } = req.body;
  const result = await query(
    `INSERT INTO treatment_plans (patient_id, doctor_id, goal, planned_sessions, start_date, target_end_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [patient_id, doctor_id, goal, planned_sessions, start_date, target_end_date ?? null]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const allowed = ["goal","planned_sessions","target_end_date","doctor_id","status"];
  const sets: string[] = []; const vals: unknown[] = []; let i = 1;
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) { sets.push(`${k} = $${i++}`); vals.push(v); }
  }
  if (!sets.length) throw ApiError.badRequest("Nothing to update");
  vals.push(req.params.id);
  const result = await query(
    `UPDATE treatment_plans SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
    vals
  );
  if (!result.rows[0]) throw ApiError.notFound("Plan not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const closePlan = asyncHandler(async (req: Request, res: Response) => {
  const { discharge_summary } = req.body;
  const result = await query(
    `UPDATE treatment_plans SET status = 'closed', discharge_summary = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [discharge_summary ?? null, req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Plan not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const getPlanProgress = asyncHandler(async (req: Request, res: Response) => {
  // Aggregate outcome measures (scale answers) over time for progress tracking
  const result = await query(
    `SELECT q.text AS metric, sfr.answer_value AS value, s.scheduled_at AS date
     FROM session_form_responses sfr
     JOIN sessions s ON s.id = sfr.session_id
     JOIN questions q ON q.id = sfr.question_id
     WHERE s.treatment_plan_id = $1 AND sfr.answer_value IS NOT NULL
     ORDER BY s.scheduled_at`,
    [req.params.id]
  );
  ApiResponse.ok(res, result.rows);
});
