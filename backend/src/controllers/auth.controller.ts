import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await query<{ id: string; email: string; password_hash: string; full_name: string; role: string; branch_id: string | null; is_active: boolean }>(
    "SELECT id, email, password_hash, full_name, role, branch_id, is_active FROM staff WHERE email = $1",
    [email]
  );
  const staff = result.rows[0];
  if (!staff || !(await bcrypt.compare(password, staff.password_hash)))
    throw ApiError.unauthorized("Invalid email or password");
  if (!staff.is_active)
    throw ApiError.forbidden("Account is deactivated");

  const token = jwt.sign(
    { sub: staff.id, role: staff.role, branchId: staff.branch_id },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  ApiResponse.ok(res, {
    token,
    user: { id: staff.id, email: staff.email, full_name: staff.full_name, role: staff.role, branch_id: staff.branch_id },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT s.id, s.email, s.full_name, s.role, s.phone, s.branch_id, s.is_active,
            d.id AS doctor_id, d.specialty
     FROM staff s
     LEFT JOIN doctors d ON d.staff_id = s.id
     WHERE s.id = $1`,
    [req.user!.sub]
  );
  if (!result.rows[0]) throw ApiError.notFound("Staff not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const result = await query("SELECT password_hash FROM staff WHERE id = $1", [req.user!.sub]);
  const staff = result.rows[0];
  if (!staff || !(await bcrypt.compare(current_password, staff.password_hash)))
    throw ApiError.badRequest("Current password is incorrect");

  const hash = await bcrypt.hash(new_password, 12);
  await query("UPDATE staff SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hash, req.user!.sub]);
  ApiResponse.ok(res, null, "Password updated");
});
