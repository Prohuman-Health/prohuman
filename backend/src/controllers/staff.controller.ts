import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const { role, branch_id, is_active = "true" } = req.query as Record<string, string>;
  const conditions = ["1=1"];
  const vals: unknown[] = [];
  let i = 1;
  if (role)      { conditions.push(`role = $${i++}`);      vals.push(role); }
  if (branch_id) { conditions.push(`branch_id = $${i++}`); vals.push(branch_id); }
  conditions.push(`is_active = $${i++}`);
  vals.push(is_active !== "false");

  const result = await query(
    `SELECT id, email, full_name, role, phone, branch_id, is_active, created_at
     FROM staff WHERE ${conditions.join(" AND ")} ORDER BY full_name`,
    vals
  );
  ApiResponse.ok(res, result.rows);
});

export const getStaff = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT s.id, s.email, s.full_name, s.role, s.phone, s.branch_id, s.is_active,
            d.id AS doctor_id, d.specialty
     FROM staff s LEFT JOIN doctors d ON d.staff_id = s.id
     WHERE s.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Staff not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, full_name, role, phone, branch_id } = req.body;

  const existing = await query("SELECT id FROM staff WHERE email = $1", [email]);
  if (existing.rows[0]) throw ApiError.conflict("Email already in use");

  const hash = await bcrypt.hash(password, 12);

  const staff = await withTransaction(async (client) => {
    const row = await client.query(
      `INSERT INTO staff (email, password_hash, full_name, role, phone, branch_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, email, full_name, role, branch_id`,
      [email, hash, full_name, role, phone ?? null, branch_id ?? null]
    );
    // Auto-create doctor record for doctor role
    if (role === "doctor") {
      await client.query("INSERT INTO doctors (staff_id) VALUES ($1)", [row.rows[0].id]);
    }
    return row.rows[0];
  });

  ApiResponse.created(res, staff);
});

export const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  const allowed = ["full_name", "phone", "branch_id", "is_active", "role"];
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) { sets.push(`${k} = $${i++}`); vals.push(v); }
  }
  if (!sets.length) throw ApiError.badRequest("Nothing to update");
  vals.push(req.params.id);
  const result = await query(
    `UPDATE staff SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING id, email, full_name, role, branch_id`,
    vals
  );
  if (!result.rows[0]) throw ApiError.notFound("Staff not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const deactivateStaff = asyncHandler(async (req: Request, res: Response) => {
  await query("UPDATE staff SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});
