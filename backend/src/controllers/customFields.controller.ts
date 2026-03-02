import { Request, Response } from "express";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listFieldDefinitions = asyncHandler(async (req: Request, res: Response) => {
  const { entity, is_active = "true" } = req.query as Record<string, string>;
  const conditions = [`is_active = $1`]; const vals: unknown[] = [is_active !== "false"]; let i = 2;
  if (entity) { conditions.push(`entity = $${i++}`); vals.push(entity); }
  const result = await query(
    `SELECT * FROM custom_field_definitions WHERE ${conditions.join(" AND ")} ORDER BY order_index, label`,
    vals
  );
  ApiResponse.ok(res, result.rows);
});

export const getFieldDefinition = asyncHandler(async (req: Request, res: Response) => {
  const result = await query("SELECT * FROM custom_field_definitions WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) throw ApiError.notFound("Field not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const createFieldDefinition = asyncHandler(async (req: Request, res: Response) => {
  const { entity, label, field_key, input_type, options, is_required, order_index } = req.body;
  const dup = await query(
    "SELECT id FROM custom_field_definitions WHERE entity = $1 AND field_key = $2",
    [entity, field_key]
  );
  if (dup.rows[0]) throw ApiError.conflict(`field_key '${field_key}' already exists for entity '${entity}'`);
  const result = await query(
    `INSERT INTO custom_field_definitions (entity, label, field_key, input_type, options, is_required, order_index, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [entity, label, field_key, input_type, options ? JSON.stringify(options) : null,
     is_required ?? false, order_index ?? 0, req.user!.sub]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updateFieldDefinition = asyncHandler(async (req: Request, res: Response) => {
  const allowed = ["label","input_type","options","is_required","order_index","is_active"];
  const sets: string[] = []; const vals: unknown[] = []; let i = 1;
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) { sets.push(`${k} = $${i++}`); vals.push(k === "options" ? JSON.stringify(v) : v); }
  }
  if (!sets.length) throw ApiError.badRequest("Nothing to update");
  vals.push(req.params.id);
  const result = await query(
    `UPDATE custom_field_definitions SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING *`, vals
  );
  if (!result.rows[0]) throw ApiError.notFound("Field not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const deactivateFieldDefinition = asyncHandler(async (req: Request, res: Response) => {
  await query("UPDATE custom_field_definitions SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});

export const reorderFields = asyncHandler(async (req: Request, res: Response) => {
  const items: Array<{ id: string; order_index: number }> = req.body;
  await withTransaction(async (client) => {
    for (const item of items) {
      await client.query(
        "UPDATE custom_field_definitions SET order_index = $1 WHERE id = $2",
        [item.order_index, item.id]
      );
    }
  });
  ApiResponse.ok(res, null, "Fields reordered");
});
