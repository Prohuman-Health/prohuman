import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { q, tag, type, is_active = "true" } = req.query as Record<string, string>;
  const conditions = [`is_active = $1`];
  const vals: unknown[] = [is_active !== "false"];
  let i = 2;
  if (q)    { conditions.push(`text ILIKE $${i++}`);          vals.push(`%${q}%`); }
  if (tag)  { conditions.push(`$${i++} = ANY(tags)`);         vals.push(tag); }
  if (type) { conditions.push(`answer_type = $${i++}`);       vals.push(type); }
  const result = await query(
    `SELECT * FROM questions WHERE ${conditions.join(" AND ")} ORDER BY text`,
    vals
  );
  ApiResponse.ok(res, result.rows);
});

export const getQuestion = asyncHandler(async (req: Request, res: Response) => {
  const result = await query("SELECT * FROM questions WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) throw ApiError.notFound("Question not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const createQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { text, answer_type, options, scale_min, scale_max, tags } = req.body;
  const result = await query(
    `INSERT INTO questions (text, answer_type, options, scale_min, scale_max, tags)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [text, answer_type, options ? JSON.stringify(options) : null, scale_min ?? null, scale_max ?? null, tags ?? []]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updateQuestion = asyncHandler(async (req: Request, res: Response) => {
  const allowed = ["text","answer_type","options","scale_min","scale_max","tags"];
  const sets: string[] = []; const vals: unknown[] = []; let i = 1;
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) {
      sets.push(`${k} = $${i++}`);
      vals.push(k === "options" ? JSON.stringify(v) : v);
    }
  }
  if (!sets.length) throw ApiError.badRequest("Nothing to update");
  vals.push(req.params.id);
  const result = await query(
    `UPDATE questions SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
    vals
  );
  if (!result.rows[0]) throw ApiError.notFound("Question not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const retireQuestion = asyncHandler(async (req: Request, res: Response) => {
  await query("UPDATE questions SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});

export const getQuestionUsage = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT f.id, f.title, f.is_published FROM form_questions fq
     JOIN forms f ON f.id = fq.form_id
     WHERE fq.question_id = $1`,
    [req.params.id]
  );
  ApiResponse.ok(res, result.rows);
});
