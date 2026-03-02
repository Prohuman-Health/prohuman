import { Request, Response } from "express";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listSessionTypes = asyncHandler(async (req: Request, res: Response) => {
  const { is_active = "true" } = req.query as Record<string, string>;
  const result = await query(
    `SELECT st.*, f.title AS form_title
     FROM session_types st LEFT JOIN forms f ON f.id = st.form_id
     WHERE st.is_active = $1 ORDER BY st.name`,
    [is_active !== "false"]
  );
  ApiResponse.ok(res, result.rows);
});

export const getSessionType = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT st.*, f.title AS form_title
     FROM session_types st LEFT JOIN forms f ON f.id = st.form_id
     WHERE st.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Session type not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const createSessionType = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, default_duration_minutes, fee, form_id, is_active } = req.body;
  const result = await query(
    `INSERT INTO session_types (name, description, default_duration_minutes, fee, form_id, is_active)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, description ?? null, default_duration_minutes, fee, form_id ?? null, is_active ?? true]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updateSessionType = asyncHandler(async (req: Request, res: Response) => {
  const allowed = ["name","description","default_duration_minutes","fee","form_id","is_active"];
  const sets: string[] = []; const vals: unknown[] = []; let i = 1;
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) { sets.push(`${k} = $${i++}`); vals.push(v); }
  }
  if (!sets.length) throw ApiError.badRequest("Nothing to update");
  vals.push(req.params.id);
  const result = await query(
    `UPDATE session_types SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
    vals
  );
  if (!result.rows[0]) throw ApiError.notFound("Session type not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const archiveSessionType = asyncHandler(async (req: Request, res: Response) => {
  await query("UPDATE session_types SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});
