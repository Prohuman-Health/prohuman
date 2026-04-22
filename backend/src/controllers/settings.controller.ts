import { Request, Response } from "express";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listSettings = asyncHandler(async (req: Request, res: Response) => {
  const { branch_id } = req.query as Record<string, string>;
  const result = branch_id
    ? await query("SELECT * FROM settings WHERE branch_id = $1 ORDER BY key", [branch_id])
    : await query("SELECT * FROM settings WHERE branch_id IS NULL ORDER BY key");
  ApiResponse.ok(res, result.rows);
});

export const getSetting = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    "SELECT * FROM settings WHERE key = $1 AND branch_id IS NULL",
    [req.params.key]
  );
  if (!result.rows[0]) throw ApiError.notFound("Setting not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const upsertSetting = asyncHandler(async (req: Request, res: Response) => {
  const { key, value, description, branch_id } = req.body;
  const result = await query(
    `INSERT INTO settings (key, value, description, branch_id, updated_by)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (key) WHERE branch_id IS NULL DO UPDATE
       SET value = $2, description = COALESCE($3, settings.description),
           updated_by = $5, updated_at = NOW()
     RETURNING *`,
    [key, JSON.stringify(value), description ?? null, branch_id ?? null, req.user!.sub]
  );
  ApiResponse.ok(res, result.rows[0]);
});

/** Bulk upsert — replaces all or many settings in one call */
export const bulkUpsertSettings = asyncHandler(async (req: Request, res: Response) => {
  const incoming = req.body as
    | { key: string; value: unknown; description?: string; branch_id?: string | null }
    | Array<{ key: string; value: unknown; description?: string; branch_id?: string | null }>;

  const settings = Array.isArray(incoming) ? incoming : [incoming];

  const updated = await withTransaction(async (client) => {
    const rows = [];
    for (const s of settings) {
      const r = await client.query(
        `INSERT INTO settings (key, value, description, branch_id, updated_by)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (key) WHERE branch_id IS NULL DO UPDATE
           SET value = $2, description = COALESCE($3, settings.description),
               updated_by = $5, updated_at = NOW()
         RETURNING *`,
        [s.key, JSON.stringify(s.value), s.description ?? null, s.branch_id ?? null, req.user!.sub]
      );
      rows.push(r.rows[0]);
    }
    return rows;
  });
  ApiResponse.ok(res, updated, `${updated.length} settings updated`);
});

export const deleteSetting = asyncHandler(async (req: Request, res: Response) => {
  // Protect built-in settings from deletion
  const builtIn = ["patient_id_prefix","patient_id_digits","clinic_name","clinic_timezone"];
  if (builtIn.includes(req.params.key as string)) throw ApiError.forbidden("Cannot delete a built-in setting");
  await query("DELETE FROM settings WHERE key = $1 AND branch_id IS NULL", [req.params.key]);
  ApiResponse.noContent(res);
});
