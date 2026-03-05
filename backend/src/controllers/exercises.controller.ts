import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

// ── List exercises ──────────────────────────────────────────────────────────
export const listExercises = asyncHandler(async (req: Request, res: Response) => {
    const { category, search, active = "true", page = "1", limit = "50" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"]; const vals: unknown[] = []; let i = 1;

    if (active !== "all") { conditions.push(`e.is_active = $${i++}`); vals.push(active === "true"); }
    if (category) { conditions.push(`e.category = $${i++}`); vals.push(category); }
    if (search) { conditions.push(`(e.name ILIKE $${i} OR e.description ILIKE $${i} OR $${i} = ANY(e.tags))`); i++; vals.push(`%${search}%`); }

    vals.push(parseInt(limit), offset);
    const result = await query(
        `SELECT e.*, sf.full_name AS created_by_name, COUNT(*) OVER() AS total_count
     FROM exercises e
     LEFT JOIN staff sf ON sf.id = e.created_by
     WHERE ${conditions.join(" AND ")}
     ORDER BY e.name ASC LIMIT $${i++} OFFSET $${i++}`,
        vals
    );
    const total = result.rows[0]?.total_count ?? 0;
    ApiResponse.ok(res, { exercises: result.rows, total: parseInt(total), page: parseInt(page) });
});

// ── Get single exercise ─────────────────────────────────────────────────────
export const getExercise = asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
        `SELECT e.*, sf.full_name AS created_by_name
     FROM exercises e
     LEFT JOIN staff sf ON sf.id = e.created_by
     WHERE e.id = $1`,
        [req.params.id]
    );
    if (!result.rows[0]) throw ApiError.notFound("Exercise not found");
    ApiResponse.ok(res, result.rows[0]);
});

// ── Create exercise ─────────────────────────────────────────────────────────
export const createExercise = asyncHandler(async (req: Request, res: Response) => {
    const { name, category, description, instructions, video_url, image_url, tags } = req.body;
    if (!name) throw ApiError.badRequest("name is required");

    const result = await query(
        `INSERT INTO exercises (name, category, description, instructions, video_url, image_url, tags, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
        [name, category ?? null, description ?? null, instructions ?? null,
            video_url ?? null, image_url ?? null,
            tags ? `{${(tags as string[]).join(",")}}` : null,
            req.user!.sub]
    );
    ApiResponse.created(res, result.rows[0]);
});

// ── Update exercise ─────────────────────────────────────────────────────────
export const updateExercise = asyncHandler(async (req: Request, res: Response) => {
    const existing = await query("SELECT id FROM exercises WHERE id = $1", [req.params.id]);
    if (!existing.rows[0]) throw ApiError.notFound("Exercise not found");

    const { name, category, description, instructions, video_url, image_url, tags, is_active } = req.body;
    const result = await query(
        `UPDATE exercises SET
      name         = COALESCE($1, name),
      category     = COALESCE($2, category),
      description  = COALESCE($3, description),
      instructions = COALESCE($4, instructions),
      video_url    = COALESCE($5, video_url),
      image_url    = COALESCE($6, image_url),
      tags         = COALESCE($7, tags),
      is_active    = COALESCE($8, is_active),
      updated_at   = NOW()
     WHERE id = $9 RETURNING *`,
        [name ?? null, category ?? null, description ?? null, instructions ?? null,
        video_url ?? null, image_url ?? null,
        tags ? `{${(tags as string[]).join(",")}}` : null,
        is_active ?? null,
        req.params.id]
    );
    ApiResponse.ok(res, result.rows[0]);
});

// ── Delete (soft) exercise ──────────────────────────────────────────────────
export const deleteExercise = asyncHandler(async (req: Request, res: Response) => {
    const existing = await query("SELECT id FROM exercises WHERE id = $1", [req.params.id]);
    if (!existing.rows[0]) throw ApiError.notFound("Exercise not found");
    await query("UPDATE exercises SET is_active = false, updated_at = NOW() WHERE id = $1", [req.params.id]);
    ApiResponse.ok(res, null, "Exercise deactivated");
});

// ── List exercise categories ────────────────────────────────────────────────
export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
    const result = await query(
        "SELECT DISTINCT category FROM exercises WHERE category IS NOT NULL AND is_active = true ORDER BY category"
    );
    ApiResponse.ok(res, result.rows.map(r => r.category));
});
