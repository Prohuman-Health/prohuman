import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

// ── Label Definitions ─────────────────────────────────────────────────────────

export const listLabels = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT * FROM patient_label_definitions ORDER BY name`,
    []
  );
  ApiResponse.ok(res, result.rows);
});

export const createLabel = asyncHandler(async (req: Request, res: Response) => {
  const { name, color, branch_id } = req.body;
  if (!name?.trim()) throw ApiError.badRequest("Label name is required");
  const result = await query(
    `INSERT INTO patient_label_definitions (name, color, branch_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [name.trim(), color ?? "#6366f1", branch_id ?? null]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updateLabel = asyncHandler(async (req: Request, res: Response) => {
  const { name, color } = req.body;
  const result = await query(
    `UPDATE patient_label_definitions
     SET name = COALESCE($1, name), color = COALESCE($2, color)
     WHERE id = $3 RETURNING *`,
    [name ?? null, color ?? null, req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Label not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const deleteLabel = asyncHandler(async (req: Request, res: Response) => {
  await query("DELETE FROM patient_label_definitions WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});

// ── Label Assignments ─────────────────────────────────────────────────────────

export const getPatientLabels = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT pld.* FROM patient_label_assignments pla
     JOIN patient_label_definitions pld ON pld.id = pla.label_id
     WHERE pla.patient_id = $1 ORDER BY pld.name`,
    [req.params.patientId]
  );
  ApiResponse.ok(res, result.rows);
});

export const assignLabel = asyncHandler(async (req: Request, res: Response) => {
  const { label_id } = req.body;
  if (!label_id) throw ApiError.badRequest("label_id is required");
  await query(
    `INSERT INTO patient_label_assignments (patient_id, label_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [req.params.patientId, label_id]
  );
  ApiResponse.created(res, { patient_id: req.params.patientId, label_id });
});

export const removeLabel = asyncHandler(async (req: Request, res: Response) => {
  await query(
    `DELETE FROM patient_label_assignments WHERE patient_id = $1 AND label_id = $2`,
    [req.params.patientId, req.params.labelId]
  );
  ApiResponse.noContent(res);
});

// ── Bulk: list all patients with their labels ────────────────────────────────
export const listPatientsWithLabels = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT p.id AS patient_id,
            COALESCE(
              json_agg(
                json_build_object('id', pld.id, 'name', pld.name, 'color', pld.color)
                ORDER BY pld.name
              ) FILTER (WHERE pld.id IS NOT NULL),
              '[]'
            ) AS labels
     FROM patients p
     LEFT JOIN patient_label_assignments pla ON pla.patient_id = p.id
     LEFT JOIN patient_label_definitions pld ON pld.id = pla.label_id
     GROUP BY p.id`,
    []
  );
  // Return as a map { patient_id -> labels[] }
  const map: Record<string, unknown[]> = {};
  for (const row of result.rows) map[row.patient_id] = row.labels;
  ApiResponse.ok(res, map);
});
