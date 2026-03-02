import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, session_id, category } = req.query as Record<string, string>;
  const conditions = ["1=1"]; const vals: unknown[] = []; let i = 1;
  if (patient_id) { conditions.push(`patient_id = $${i++}`); vals.push(patient_id); }
  if (session_id) { conditions.push(`session_id = $${i++}`); vals.push(session_id); }
  if (category)   { conditions.push(`category = $${i++}`);   vals.push(category); }
  const result = await query(
    `SELECT * FROM documents WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`, vals
  );
  ApiResponse.ok(res, result.rows);
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, session_id, file_name, file_url, file_type, category } = req.body;

  // Validate file type against settings
  const settingRow = await query(
    "SELECT value FROM settings WHERE key = 'supported_file_types' AND branch_id IS NULL"
  );
  const allowed: string[] = JSON.parse(settingRow.rows[0]?.value ?? '["pdf","jpeg","jpg","png"]');
  const ext = file_type.split("/").pop()?.toLowerCase() ?? "";
  if (!allowed.includes(ext) && !allowed.includes(file_type.toLowerCase())) {
    throw ApiError.badRequest(`File type '${file_type}' is not allowed. Allowed: ${allowed.join(", ")}`);
  }

  const result = await query(
    `INSERT INTO documents (patient_id, session_id, file_name, file_url, file_type, category, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [patient_id, session_id ?? null, file_name, file_url, file_type, category ?? null, req.user!.sub]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  const result = await query("SELECT * FROM documents WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) throw ApiError.notFound("Document not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  await query("DELETE FROM documents WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});
