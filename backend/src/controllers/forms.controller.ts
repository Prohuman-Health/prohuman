import { Request, Response } from "express";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const listForms = asyncHandler(async (req: Request, res: Response) => {
  const showArchived = req.query.archived === "true";
  const result = await query(
    showArchived
      ? "SELECT * FROM forms ORDER BY title"
      : "SELECT * FROM forms WHERE is_archived = FALSE ORDER BY title"
  );
  ApiResponse.ok(res, result.rows);
});

export const getForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await query("SELECT * FROM forms WHERE id = $1", [req.params.id]);
  if (!form.rows[0]) throw ApiError.notFound("Form not found");
  const questions = await query(
    `SELECT q.*, fq.order_index, fq.is_required
     FROM form_questions fq JOIN questions q ON q.id = fq.question_id
     WHERE fq.form_id = $1 ORDER BY fq.order_index`,
    [req.params.id]
  );
  ApiResponse.ok(res, { ...form.rows[0], questions: questions.rows });
});

export const createForm = asyncHandler(async (req: Request, res: Response) => {
  const { title, description } = req.body;
  const result = await query(
    "INSERT INTO forms (title, description) VALUES ($1,$2) RETURNING *",
    [title, description ?? null]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updateForm = asyncHandler(async (req: Request, res: Response) => {
  const { title, description } = req.body;
  const result = await query(
    `UPDATE forms SET title = COALESCE($1,title), description = COALESCE($2,description), updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [title ?? null, description ?? null, req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Form not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const deleteForm = asyncHandler(async (req: Request, res: Response) => {
  const used = await query("SELECT id FROM session_types WHERE form_id = $1 AND is_active = TRUE", [req.params.id]);
  if (used.rows.length) throw ApiError.conflict("Form is linked to active session types");
  await query("DELETE FROM forms WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});

export const archiveForm = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    "UPDATE forms SET is_archived = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *",
    [req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Form not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const publishForm = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    "UPDATE forms SET is_published = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *",
    [req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Form not found");
  ApiResponse.ok(res, result.rows[0]);
});

/** Full replace of all questions in a form */
export const setFormQuestions = asyncHandler(async (req: Request, res: Response) => {
  const questions: Array<{ question_id: string; order_index: number; is_required: boolean }> = req.body;
  await withTransaction(async (client) => {
    await client.query("DELETE FROM form_questions WHERE form_id = $1", [req.params.id]);
    for (const q of questions) {
      await client.query(
        "INSERT INTO form_questions (form_id, question_id, order_index, is_required) VALUES ($1,$2,$3,$4)",
        [req.params.id, q.question_id, q.order_index, q.is_required ?? true]
      );
    }
    await client.query("UPDATE forms SET updated_at = NOW() WHERE id = $1", [req.params.id]);
  });
  const updated = await query(
    `SELECT q.*, fq.order_index, fq.is_required
     FROM form_questions fq JOIN questions q ON q.id = fq.question_id
     WHERE fq.form_id = $1 ORDER BY fq.order_index`,
    [req.params.id]
  );
  ApiResponse.ok(res, updated.rows);
});

/** Upsert specific questions into a form (append/update without touching others) */
export const addFormQuestions = asyncHandler(async (req: Request, res: Response) => {
  const questions: Array<{ question_id: string; order_index: number; is_required: boolean }> = req.body;
  await withTransaction(async (client) => {
    for (const q of questions) {
      await client.query(
        `INSERT INTO form_questions (form_id, question_id, order_index, is_required)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (form_id, question_id)
         DO UPDATE SET order_index = $3, is_required = $4`,
        [req.params.id, q.question_id, q.order_index, q.is_required ?? true]
      );
    }
    await client.query("UPDATE forms SET updated_at = NOW() WHERE id = $1", [req.params.id]);
  });
  ApiResponse.ok(res, null, "Questions updated");
});
