import { Request, Response } from "express";
import { query }  from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listPackages = asyncHandler(async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT bp.*, st.name AS session_type_name
     FROM billing_packages bp LEFT JOIN session_types st ON st.id = bp.session_type_id
     ORDER BY bp.name`
  );
  ApiResponse.ok(res, result.rows);
});

export const createPackage = asyncHandler(async (req: Request, res: Response) => {
  const { session_type_id, name, session_count, total_price, is_active } = req.body;
  const result = await query(
    "INSERT INTO billing_packages (session_type_id, name, session_count, total_price, is_active) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [session_type_id ?? null, name, session_count, total_price, is_active ?? true]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updatePackage = asyncHandler(async (req: Request, res: Response) => {
  const allowed = ["name","session_type_id","session_count","total_price","is_active"];
  const sets: string[] = []; const vals: unknown[] = []; let i = 1;
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) { sets.push(`${k} = $${i++}`); vals.push(v); }
  }
  if (!sets.length) throw ApiError.badRequest("Nothing to update");
  vals.push(req.params.id);
  const result = await query(
    `UPDATE billing_packages SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING *`, vals
  );
  if (!result.rows[0]) throw ApiError.notFound("Package not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const deactivatePackage = asyncHandler(async (req: Request, res: Response) => {
  await query("UPDATE billing_packages SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});

export const assignPackage = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, package_id, expires_at } = req.body;
  const pkg = await query("SELECT session_count FROM billing_packages WHERE id = $1", [package_id]);
  if (!pkg.rows[0]) throw ApiError.notFound("Package not found");
  const result = await query(
    `INSERT INTO patient_packages (patient_id, package_id, sessions_remaining, expires_at)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [patient_id, package_id, pkg.rows[0].session_count, expires_at ?? null]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const listPatientPackages = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id } = req.query as Record<string, string>;
  const result = await query(
    `SELECT pp.*, bp.name AS package_name, bp.session_count, bp.total_price
     FROM patient_packages pp JOIN billing_packages bp ON bp.id = pp.package_id
     WHERE pp.patient_id = $1 ORDER BY pp.purchased_at DESC`,
    [patient_id]
  );
  ApiResponse.ok(res, result.rows);
});

export const revokePatientPackage = asyncHandler(async (req: Request, res: Response) => {
  await query("UPDATE patient_packages SET is_active = FALSE WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});

export const listInsurance = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id } = req.query as Record<string, string>;
  const result = await query(
    "SELECT * FROM insurance_records WHERE patient_id = $1 ORDER BY created_at DESC", [patient_id]
  );
  ApiResponse.ok(res, result.rows);
});

export const createInsurance = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, provider, policy_number, notes } = req.body;
  const result = await query(
    "INSERT INTO insurance_records (patient_id, provider, policy_number, notes) VALUES ($1,$2,$3,$4) RETURNING *",
    [patient_id, provider, policy_number ?? null, notes ?? null]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updateInsurance = asyncHandler(async (req: Request, res: Response) => {
  const { provider, policy_number, notes } = req.body;
  const result = await query(
    `UPDATE insurance_records SET provider = COALESCE($1,provider), policy_number = COALESCE($2,policy_number),
     notes = COALESCE($3,notes), updated_at = NOW() WHERE id = $4 RETURNING *`,
    [provider ?? null, policy_number ?? null, notes ?? null, req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Record not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const deleteInsurance = asyncHandler(async (req: Request, res: Response) => {
  await query("DELETE FROM insurance_records WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});

export const billingSummary = asyncHandler(async (req: Request, res: Response) => {
  const { from, to, branch_id } = req.query as Record<string, string>;
  const conditions = ["1=1"]; const vals: unknown[] = []; let i = 1;
  if (from)      { conditions.push(`i.created_at >= $${i++}`); vals.push(from); }
  if (to)        { conditions.push(`i.created_at <= $${i++}`); vals.push(to); }
  if (branch_id) { conditions.push(`s.branch_id = $${i++}`);   vals.push(branch_id); }
  const result = await query(
    `SELECT i.status, COUNT(*) AS count, SUM(i.amount) AS total
     FROM invoices i JOIN sessions s ON s.id = i.session_id
     WHERE ${conditions.join(" AND ")} GROUP BY i.status`,
    vals
  );
  ApiResponse.ok(res, result.rows);
});

export const patientBillingSummary = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT i.status, COUNT(*) AS count, SUM(i.amount) AS total
     FROM invoices i WHERE i.patient_id = $1 GROUP BY i.status`,
    [req.params.patientId]
  );
  ApiResponse.ok(res, result.rows);
});
