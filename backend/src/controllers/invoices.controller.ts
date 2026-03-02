import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, status, from, to } = req.query as Record<string, string>;
  const conditions = ["1=1"]; const vals: unknown[] = []; let i = 1;
  if (patient_id) { conditions.push(`i.patient_id = $${i++}`); vals.push(patient_id); }
  if (status)     { conditions.push(`i.status = $${i++}`);     vals.push(status); }
  if (from)       { conditions.push(`i.created_at >= $${i++}`); vals.push(from); }
  if (to)         { conditions.push(`i.created_at <= $${i++}`); vals.push(to); }
  const result = await query(
    `SELECT i.*, p.full_name AS patient_name, p.patient_code,
            st.name AS session_type
     FROM invoices i
     JOIN patients p      ON p.id = i.patient_id
     JOIN sessions s      ON s.id = i.session_id
     JOIN session_types st ON st.id = s.session_type_id
     WHERE ${conditions.join(" AND ")} ORDER BY i.created_at DESC`,
    vals
  );
  ApiResponse.ok(res, result.rows);
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT i.*, p.full_name AS patient_name, st.name AS session_type
     FROM invoices i
     JOIN patients p       ON p.id = i.patient_id
     JOIN sessions s       ON s.id = i.session_id
     JOIN session_types st ON st.id = s.session_type_id
     WHERE i.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Invoice not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const updateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { status, notes } = req.body;
  const paid_at = status === "paid" ? new Date().toISOString() : null;
  const result = await query(
    `UPDATE invoices SET status = $1, paid_at = COALESCE($2, paid_at), notes = COALESCE($3, notes), updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [status, paid_at, notes ?? null, req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Invoice not found");
  ApiResponse.ok(res, result.rows[0]);
});
