import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listBranches = asyncHandler(async (_req: Request, res: Response) => {
  const result = await query("SELECT * FROM branches ORDER BY name");
  ApiResponse.ok(res, result.rows);
});

export const getBranch = asyncHandler(async (req: Request, res: Response) => {
  const result = await query("SELECT * FROM branches WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) throw ApiError.notFound("Branch not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const createBranch = asyncHandler(async (req: Request, res: Response) => {
  const { name, address, phone, email, operating_hours } = req.body;
  const result = await query(
    `INSERT INTO branches (name, address, phone, email, operating_hours)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [name, address, phone ?? null, email ?? null, JSON.stringify(operating_hours ?? {})]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updateBranch = asyncHandler(async (req: Request, res: Response) => {
  const fields = req.body;
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = $${i++}`);
    vals.push(k === "operating_hours" ? JSON.stringify(v) : v);
  }
  if (!sets.length) throw ApiError.badRequest("Nothing to update");
  vals.push(req.params.id);
  const result = await query(
    `UPDATE branches SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
    vals
  );
  if (!result.rows[0]) throw ApiError.notFound("Branch not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const deleteBranch = asyncHandler(async (req: Request, res: Response) => {
  await query("UPDATE branches SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});
