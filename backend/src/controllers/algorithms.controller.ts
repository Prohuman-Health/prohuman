import { Request, Response } from "express";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

// ── List algorithms ─────────────────────────────────────────────────────────
export const listAlgorithms = asyncHandler(async (req: Request, res: Response) => {
    const { search, active = "true", page = "1", limit = "50" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"]; const vals: unknown[] = []; let i = 1;

    if (active !== "all") { conditions.push(`a.is_active = $${i++}`); vals.push(active === "true"); }
    if (search) { conditions.push(`(a.name ILIKE $${i} OR a.diagnosis ILIKE $${i})`); i++; vals.push(`%${search}%`); }

    vals.push(parseInt(limit), offset);
    const result = await query(
        `SELECT a.id, a.name, a.diagnosis, a.description, a.estimated_sessions,
            a.is_active, a.created_at, a.updated_at,
            sf.full_name AS created_by_name,
            COUNT(*) OVER() AS total_count
     FROM algorithms a
     LEFT JOIN staff sf ON sf.id = a.created_by
     WHERE ${conditions.join(" AND ")}
     ORDER BY a.name ASC LIMIT $${i++} OFFSET $${i++}`,
        vals
    );
    const total = result.rows[0]?.total_count ?? 0;
    ApiResponse.ok(res, { algorithms: result.rows, total: parseInt(total), page: parseInt(page) });
});

// ── Get single algorithm (with exercises) ───────────────────────────────────
export const getAlgorithm = asyncHandler(async (req: Request, res: Response) => {
    const algResult = await query(
        `SELECT a.*, sf.full_name AS created_by_name
     FROM algorithms a
     LEFT JOIN staff sf ON sf.id = a.created_by
     WHERE a.id = $1`,
        [req.params.id]
    );
    if (!algResult.rows[0]) throw ApiError.notFound("Algorithm not found");

    const exResult = await query(
        `SELECT ae.*, e.name AS exercise_name, e.category, e.video_url, e.instructions
     FROM algorithm_exercises ae
     JOIN exercises e ON e.id = ae.exercise_id
     WHERE ae.algorithm_id = $1
     ORDER BY ae.order_index ASC`,
        [req.params.id]
    );

    ApiResponse.ok(res, { ...algResult.rows[0], exercises: exResult.rows });
});

// ── Create algorithm ────────────────────────────────────────────────────────
export const createAlgorithm = asyncHandler(async (req: Request, res: Response) => {
    const {
        name, diagnosis, description,
        evaluation_steps, treatment_steps, red_flags,
        outcome_measures, estimated_sessions, exercises
    } = req.body;
    if (!name) throw ApiError.badRequest("name is required");

    const result = await withTransaction(async (client) => {
        const algRow = await client.query(
            `INSERT INTO algorithms
         (name, diagnosis, description, evaluation_steps, treatment_steps,
          red_flags, outcome_measures, estimated_sessions, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [
                name,
                diagnosis ?? null,
                description ?? null,
                JSON.stringify(evaluation_steps ?? []),
                JSON.stringify(treatment_steps ?? []),
                JSON.stringify(red_flags ?? []),
                outcome_measures ?? null,
                estimated_sessions ?? null,
                req.user!.sub
            ]
        );
        const alg = algRow.rows[0];

        // Link exercises if provided
        if (Array.isArray(exercises) && exercises.length > 0) {
            for (let idx = 0; idx < exercises.length; idx++) {
                const ex = exercises[idx];
                await client.query(
                    `INSERT INTO algorithm_exercises
             (algorithm_id, exercise_id, phase, sets, reps, frequency, duration, notes, order_index)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (algorithm_id, exercise_id, phase) DO NOTHING`,
                    [alg.id, ex.exercise_id, ex.phase ?? null, ex.sets ?? null,
                    ex.reps ?? null, ex.frequency ?? null, ex.duration ?? null,
                    ex.notes ?? null, idx]
                );
            }
        }
        return alg;
    });

    ApiResponse.created(res, result);
});

// ── Update algorithm ────────────────────────────────────────────────────────
export const updateAlgorithm = asyncHandler(async (req: Request, res: Response) => {
    const existing = await query("SELECT id FROM algorithms WHERE id = $1", [req.params.id]);
    if (!existing.rows[0]) throw ApiError.notFound("Algorithm not found");

    const {
        name, diagnosis, description,
        evaluation_steps, treatment_steps, red_flags,
        outcome_measures, estimated_sessions, is_active
    } = req.body;

    const result = await query(
        `UPDATE algorithms SET
       name               = COALESCE($1,  name),
       diagnosis          = COALESCE($2,  diagnosis),
       description        = COALESCE($3,  description),
       evaluation_steps   = COALESCE($4,  evaluation_steps),
       treatment_steps    = COALESCE($5,  treatment_steps),
       red_flags          = COALESCE($6,  red_flags),
       outcome_measures   = COALESCE($7,  outcome_measures),
       estimated_sessions = COALESCE($8,  estimated_sessions),
       is_active          = COALESCE($9,  is_active),
       updated_at         = NOW()
     WHERE id = $10 RETURNING *`,
        [
            name ?? null, diagnosis ?? null, description ?? null,
            evaluation_steps ? JSON.stringify(evaluation_steps) : null,
            treatment_steps ? JSON.stringify(treatment_steps) : null,
            red_flags ? JSON.stringify(red_flags) : null,
            outcome_measures ?? null, estimated_sessions ?? null,
            is_active ?? null,
            req.params.id
        ]
    );
    ApiResponse.ok(res, result.rows[0]);
});

// ── Delete (soft) algorithm ─────────────────────────────────────────────────
export const deleteAlgorithm = asyncHandler(async (req: Request, res: Response) => {
    const existing = await query("SELECT id FROM algorithms WHERE id = $1", [req.params.id]);
    if (!existing.rows[0]) throw ApiError.notFound("Algorithm not found");
    await query("UPDATE algorithms SET is_active = false, updated_at = NOW() WHERE id = $1", [req.params.id]);
    ApiResponse.ok(res, null, "Algorithm deactivated");
});

// ── Manage exercises on an algorithm ────────────────────────────────────────
export const upsertAlgorithmExercises = asyncHandler(async (req: Request, res: Response) => {
    const alg = await query("SELECT id FROM algorithms WHERE id = $1", [req.params.id]);
    if (!alg.rows[0]) throw ApiError.notFound("Algorithm not found");

    const exercises: Array<{
        exercise_id: string; phase?: string; sets?: number; reps?: string;
        frequency?: string; duration?: string; notes?: string; order_index?: number;
    }> = req.body;

    await withTransaction(async (client) => {
        // Remove existing and re-insert (full replace)
        await client.query("DELETE FROM algorithm_exercises WHERE algorithm_id = $1", [req.params.id]);
        for (let idx = 0; idx < exercises.length; idx++) {
            const ex = exercises[idx];
            await client.query(
                `INSERT INTO algorithm_exercises
           (algorithm_id, exercise_id, phase, sets, reps, frequency, duration, notes, order_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [req.params.id, ex.exercise_id, ex.phase ?? null, ex.sets ?? null,
                ex.reps ?? null, ex.frequency ?? null, ex.duration ?? null,
                ex.notes ?? null, ex.order_index ?? idx]
            );
        }
    });
    ApiResponse.ok(res, null, "Exercises updated");
});

// ── Apply algorithm to a patient ────────────────────────────────────────────
export const applyAlgorithmToPatient = asyncHandler(async (req: Request, res: Response) => {
    const { patient_id, session_id, notes } = req.body;
    if (!patient_id) throw ApiError.badRequest("patient_id required");

    const alg = await query("SELECT id FROM algorithms WHERE id = $1 AND is_active = true", [req.params.id]);
    if (!alg.rows[0]) throw ApiError.notFound("Algorithm not found");

    const result = await query(
        `INSERT INTO patient_algorithms (patient_id, algorithm_id, session_id, applied_by, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [patient_id, req.params.id, session_id ?? null, req.user!.sub, notes ?? null]
    );
    ApiResponse.created(res, result.rows[0]);
});

// ── Get algorithms applied to a patient ─────────────────────────────────────
export const getPatientAlgorithms = asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
        `SELECT pa.*, a.name AS algorithm_name, a.diagnosis,
            sf.full_name AS applied_by_name
     FROM patient_algorithms pa
     JOIN algorithms a ON a.id = pa.algorithm_id
     LEFT JOIN staff sf ON sf.id = pa.applied_by
     WHERE pa.patient_id = $1
     ORDER BY pa.applied_at DESC`,
        [req.params.patientId]
    );
    ApiResponse.ok(res, result.rows);
});
