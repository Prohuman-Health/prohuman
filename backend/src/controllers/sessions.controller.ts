import { Request, Response } from "express";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

async function insertNotif(type: string, title: string, body: string | null, metadata: object, branchId: string | null) {
  try {
    await query(
      `INSERT INTO in_app_notifications (type, title, body, metadata, branch_id) VALUES ($1,$2,$3,$4::jsonb,$5)`,
      [type, title, body, JSON.stringify(metadata), branchId ?? null]
    );
  } catch { /* notification failure must not break main operation */ }
}

async function isSettingEnabled(key: string, fallback = false): Promise<boolean> {
  try {
    const r = await query("SELECT value FROM settings WHERE key = $1 AND branch_id IS NULL LIMIT 1", [key]);
    const v = r.rows[0]?.value;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
    if (typeof v === "number") return v === 1;
    return fallback;
  } catch {
    return fallback;
  }
}

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, doctor_id, branch_id, status, from, to, page = "1", limit = "50" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ["1=1"]; const vals: unknown[] = []; let i = 1;
  if (patient_id) { conditions.push(`s.patient_id = $${i++}`); vals.push(patient_id); }
  if (doctor_id) { conditions.push(`s.doctor_id = $${i++}`); vals.push(doctor_id); }
  if (branch_id) { conditions.push(`s.branch_id = $${i++}`); vals.push(branch_id); }
  if (status) { conditions.push(`s.status = $${i++}`); vals.push(status); }
  if (from) { conditions.push(`s.scheduled_at >= $${i++}`); vals.push(from); }
  if (to) { conditions.push(`s.scheduled_at <= $${i++}`); vals.push(to); }
  vals.push(parseInt(limit), offset);
  const result = await query(
    `SELECT s.*, p.full_name AS patient_name, p.patient_code,
            sf.full_name AS doctor_name, st.name AS session_type_name,
            b.name AS branch_name, COUNT(*) OVER() AS total_count
     FROM sessions s
     JOIN patients p      ON p.id = s.patient_id
     JOIN doctors d       ON d.id = s.doctor_id
     JOIN staff sf        ON sf.id = d.staff_id
     JOIN session_types st ON st.id = s.session_type_id
     JOIN branches b      ON b.id = s.branch_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.scheduled_at DESC LIMIT $${i++} OFFSET $${i++}`,
    vals
  );
  const total = result.rows[0]?.total_count ?? 0;
  ApiResponse.ok(res, { sessions: result.rows, total: parseInt(total), page: parseInt(page) });
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT s.*, p.full_name AS patient_name, p.patient_code,
            sf.full_name AS doctor_name, st.name AS session_type_name, st.form_id,
            b.name AS branch_name
     FROM sessions s
     JOIN patients p       ON p.id = s.patient_id
     JOIN doctors d        ON d.id = s.doctor_id
     JOIN staff sf         ON sf.id = d.staff_id
     JOIN session_types st ON st.id = s.session_type_id
     JOIN branches b       ON b.id = s.branch_id
     WHERE s.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) throw ApiError.notFound("Session not found");
  ApiResponse.ok(res, result.rows[0]);
});

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const {
    patient_id, doctor_id, branch_id, session_type_id,
    scheduled_at, duration_minutes, pre_session_notes, treatment_plan_id, recurrence,
  } = req.body;

  // Resolve default duration from session type if not provided
  let duration = duration_minutes;
  if (!duration) {
    const st = await query("SELECT default_duration_minutes FROM session_types WHERE id = $1", [session_type_id]);
    duration = st.rows[0]?.default_duration_minutes ?? 60;
  }

  const session = await withTransaction(async (client) => {
    let series_id: string | null = null;

    if (recurrence) {
      const series = await client.query(
        "INSERT INTO session_series (recurrence, interval_days, total_sessions) VALUES ($1,$2,$3) RETURNING id",
        [recurrence.pattern, recurrence.interval_days ?? null, recurrence.total_sessions]
      );
      series_id = series.rows[0].id;
    }

    const scheduledDate = new Date(scheduled_at);
    const sessions = [];

    const totalToCreate = recurrence ? recurrence.total_sessions : 1;
    const intervalDays = recurrence?.interval_days ?? (
      recurrence?.pattern === "daily" ? 1 :
        recurrence?.pattern === "weekly" ? 7 :
          recurrence?.pattern === "biweekly" ? 14 : 7
    );

    // ── Closed date + clash detection ──────────────────────────────────────────
    // Collect all clashing slots upfront so we can report them all at once
    const clashes: string[] = [];
    const closedDates: string[] = [];

    for (let n = 0; n < totalToCreate; n++) {
      const slotDate = new Date(scheduledDate);
      if (n > 0) slotDate.setDate(slotDate.getDate() + intervalDays * n);

      const closed = await client.query(
        `SELECT closure_date FROM clinic_closures
         WHERE closure_date = $1::date AND is_active = TRUE
         LIMIT 1`,
        [slotDate.toISOString().slice(0, 10)]
      );
      if (closed.rows[0]) {
        closedDates.push(slotDate.toISOString().slice(0, 10));
        continue;
      }

      // Two sessions overlap when:
      //   new_start  < existing_end  AND  new_end  > existing_start
      // i.e.  slotDate < (existing.scheduled_at + existing.duration_minutes)
      //        AND  (slotDate + duration) > existing.scheduled_at
      const clash = await client.query(
        `SELECT id, scheduled_at, duration_minutes
         FROM sessions
         WHERE doctor_id = $1
           AND status NOT IN ('cancelled', 'no-show', 'late-cancellation')
           AND scheduled_at < ($2::timestamptz + ($3 || ' minutes')::interval)
           AND (scheduled_at + (duration_minutes || ' minutes')::interval) > $2::timestamptz`,
        [doctor_id, slotDate.toISOString(), duration]
      );

      if (clash.rows.length > 0) {
        const conflicting = new Date(clash.rows[0].scheduled_at);
        clashes.push(
          `${conflicting.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} ` +
          `at ${conflicting.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`
        );
      }
    }

    if (closedDates.length > 0) {
      throw ApiError.conflict(
        `Clinic is closed on: ${[...new Set(closedDates)].join(", ")}. Please choose a different date.`
      );
    }

    if (clashes.length > 0) {
      const noun = clashes.length === 1 ? "slot clashes" : "slots clash";
      throw ApiError.conflict(
        `Doctor already has a session during: ${clashes.join(", ")}. ` +
        `Please choose a different time${clashes.length > 1 ? "s" : ""}.`
      );
    }
    // ── End clash detection ───────────────────────────────────────────────────

    for (let n = 0; n < totalToCreate; n++) {
      const date = new Date(scheduledDate);
      if (n > 0) date.setDate(date.getDate() + intervalDays * n);
      const row = await client.query(
        `INSERT INTO sessions (patient_id, doctor_id, branch_id, session_type_id, scheduled_at, duration_minutes,
                               pre_session_notes, series_id, treatment_plan_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, scheduled_at, status`,
        [patient_id, doctor_id, branch_id, session_type_id, date.toISOString(), duration,
          pre_session_notes ?? null, series_id, treatment_plan_id ?? null, req.user!.sub]
      );
      sessions.push(row.rows[0]);
    }
    return sessions;
  });

  const notifyScheduled = await isSettingEnabled("notify_session_scheduled", false);
  if (notifyScheduled) {
    try {
      const summary = await query(
        `SELECT s.id, s.branch_id, p.full_name AS patient_name, sf.full_name AS doctor_name,
                st.name AS session_type_name, s.scheduled_at
         FROM sessions s
         JOIN patients p       ON p.id = s.patient_id
         JOIN doctors d        ON d.id = s.doctor_id
         JOIN staff sf         ON sf.id = d.staff_id
         JOIN session_types st ON st.id = s.session_type_id
         WHERE s.id = $1`,
        [session[0].id]
      );

      const info = summary.rows[0];
      if (info) {
        const isSeries = session.length > 1;
        const title = isSeries
          ? `Session Series Scheduled — ${info.patient_name}`
          : `Session Scheduled — ${info.patient_name}`;
        const dateTime = new Date(info.scheduled_at).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        await insertNotif(
          "session_scheduled",
          title,
          `${info.session_type_name} with Dr. ${info.doctor_name} on ${dateTime}`,
          {
            session_id: info.id,
            patient_name: info.patient_name,
            session_count: session.length,
          },
          info.branch_id
        );
      }
    } catch {
      // notification failures must not block session creation
    }
  }

  // Auto-generate invoice for first session (paid sessions later on attendance mark)

  ApiResponse.created(res, session.length === 1 ? session[0] : session);
});


export const cancelSession = asyncHandler(async (req: Request, res: Response) => {
  const { reason, cancel_series } = req.body;
  const existing = await query("SELECT * FROM sessions WHERE id = $1", [req.params.id]);
  if (!existing.rows[0]) throw ApiError.notFound("Session not found");
  if (existing.rows[0].status === "completed") throw ApiError.badRequest("Cannot cancel a completed session");

  const ids: string[] = [req.params.id as string];

  if (cancel_series && existing.rows[0].series_id) {
    const seriesRows = await query(
      "SELECT id FROM sessions WHERE series_id = $1 AND status NOT IN ('completed','cancelled')",
      [existing.rows[0].series_id]
    );
    seriesRows.rows.forEach(r => ids.push(r.id));
  }

  await withTransaction(async (client) => {
    for (const id of ids) {
      await client.query(
        "UPDATE sessions SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
        [id]
      );
      await client.query(
        `INSERT INTO session_history (session_id, changed_by, old_status, new_status, reason)
         VALUES ($1,$2,$3,'cancelled',$4)`,
        [id, req.user!.sub, existing.rows[0].status, reason]
      );
    }
  });

  const cancelInfo = await query(
    `SELECT p.full_name AS patient_name, sf.full_name AS doctor_name, st.name AS session_type_name
     FROM sessions s
     JOIN patients p       ON p.id = s.patient_id
     JOIN doctors d        ON d.id = s.doctor_id
     JOIN staff sf         ON sf.id = d.staff_id
     JOIN session_types st ON st.id = s.session_type_id
     WHERE s.id = $1`,
    [req.params.id]
  );
  const ci = cancelInfo.rows[0];
  if (ci) {
    const cancelTitle = ids.length > 1
      ? `Series Cancelled — ${ci.patient_name}`
      : `Session Cancelled — ${ci.patient_name}`;
    await insertNotif(
      "session_cancelled", cancelTitle,
      `${ci.session_type_name} with Dr. ${ci.doctor_name}`,
      { session_id: req.params.id, patient_name: ci.patient_name },
      existing.rows[0].branch_id
    );
  }

  ApiResponse.ok(res, null, "Session(s) cancelled");
});

export const rescheduleSession = asyncHandler(async (req: Request, res: Response) => {
  const { scheduled_at, doctor_id, reason } = req.body;
  const existing = await query("SELECT * FROM sessions WHERE id = $1", [req.params.id]);
  if (!existing.rows[0]) throw ApiError.notFound("Session not found");

  const rescheduleDate = new Date(scheduled_at).toISOString().slice(0, 10);
  const closed = await query(
    `SELECT id FROM clinic_closures
     WHERE closure_date = $1::date AND is_active = TRUE
     LIMIT 1`,
    [rescheduleDate]
  );
  if (closed.rows[0]) {
    throw ApiError.conflict("Clinic is closed on the selected date. Please choose a different day.");
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE sessions SET scheduled_at = $1, doctor_id = COALESCE($2, doctor_id),
       status = 'pending', updated_at = NOW() WHERE id = $3`,
      [scheduled_at, doctor_id ?? null, req.params.id]
    );
    await client.query(
      `INSERT INTO session_history (session_id, changed_by, old_status, new_status, reason)
       VALUES ($1,$2,$3,'rescheduled',$4)`,
      [req.params.id, req.user!.sub, existing.rows[0].status, reason ?? "Rescheduled"]
    );
  });
  const updated = await query("SELECT * FROM sessions WHERE id = $1", [req.params.id]);
  ApiResponse.ok(res, updated.rows[0]);
});

export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { attendance } = req.body;
  const existing = await query("SELECT * FROM sessions WHERE id = $1", [req.params.id]);
  if (!existing.rows[0]) throw ApiError.notFound("Session not found");

  const newStatus = attendance === "attended" ? "completed" : attendance;

  await withTransaction(async (client) => {
    await client.query(
      "UPDATE sessions SET attendance = $1, status = $2, updated_at = NOW() WHERE id = $3",
      [attendance, newStatus, req.params.id]
    );

    // Auto-generate invoice on attendance
    if (attendance === "attended") {
      const stRow = await client.query(
        "SELECT fee FROM session_types WHERE id = $1",
        [existing.rows[0].session_type_id]
      );
      const fee = stRow.rows[0]?.fee ?? 0;
      await client.query(
        `INSERT INTO invoices (session_id, patient_id, amount) VALUES ($1,$2,$3)
         ON CONFLICT (session_id) DO NOTHING`,
        [req.params.id, existing.rows[0].patient_id, fee]
      );
    }

    // Check for late cancellation fee from settings
    if (attendance === "no-show" || attendance === "late-cancellation") {
      const feeEnabledRow = await client.query(
        `SELECT value FROM settings WHERE key = $1 AND branch_id IS NULL`,
        [attendance === "no-show" ? "no_show_fee_enabled" : "late_cancel_fee_enabled"]
      );
      const enabled = feeEnabledRow.rows[0]?.value === "true";
      if (enabled) {
        const feeAmountRow = await client.query(
          `SELECT value FROM settings WHERE key = $1 AND branch_id IS NULL`,
          [attendance === "no-show" ? "no_show_fee_amount" : "late_cancel_fee_amount"]
        );
        const amount = parseFloat(feeAmountRow.rows[0]?.value ?? "0");
        if (amount > 0) {
          await client.query(
            `INSERT INTO invoices (session_id, patient_id, amount, notes) VALUES ($1,$2,$3,$4)
             ON CONFLICT (session_id) DO NOTHING`,
            [req.params.id, existing.rows[0].patient_id, amount, `${attendance} fee`]
          );
        }
      }
    }
  });

  const notifyTypeMap: Record<string, string> = {
    attended: "session_completed",
    "no-show": "session_no_show",
    "late-cancellation": "session_late_cancel",
  };
  const notifType = notifyTypeMap[attendance as string];
  if (notifType) {
    const infoRow = await query(
      `SELECT p.full_name AS patient_name, sf.full_name AS doctor_name, st.name AS session_type_name
       FROM sessions s
       JOIN patients p       ON p.id = s.patient_id
       JOIN doctors d        ON d.id = s.doctor_id
       JOIN staff sf         ON sf.id = d.staff_id
       JOIN session_types st ON st.id = s.session_type_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    const info = infoRow.rows[0];
    if (info) {
      const notifTitles: Record<string, string> = {
        session_completed:  `Session Completed — ${info.patient_name}`,
        session_no_show:    `No-Show — ${info.patient_name}`,
        session_late_cancel:`Late Cancellation — ${info.patient_name}`,
      };
      await insertNotif(
        notifType, notifTitles[notifType],
        `${info.session_type_name} with Dr. ${info.doctor_name}`,
        { session_id: req.params.id, patient_name: info.patient_name },
        existing.rows[0].branch_id
      );
    }
  }

  ApiResponse.ok(res, null, "Attendance marked");
});

export const getSessionForm = asyncHandler(async (req: Request, res: Response) => {
  const session = await query(
    "SELECT session_type_id FROM sessions WHERE id = $1",
    [req.params.id]
  );
  if (!session.rows[0]) throw ApiError.notFound("Session not found");

  const st = await query(
    "SELECT form_id FROM session_types WHERE id = $1",
    [session.rows[0].session_type_id]
  );
  const form_id = st.rows[0]?.form_id;
  if (!form_id) return ApiResponse.ok(res, { form: null, responses: [] });

  const form = await query(
    `SELECT q.*, fq.order_index, fq.is_required
     FROM form_questions fq JOIN questions q ON q.id = fq.question_id
     WHERE fq.form_id = $1 ORDER BY fq.order_index`,
    [form_id]
  );
  const responses = await query(
    "SELECT * FROM session_form_responses WHERE session_id = $1",
    [req.params.id]
  );
  ApiResponse.ok(res, { form_id, questions: form.rows, responses: responses.rows });
});

export const uploadSessionFormFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("No file uploaded");

  const session = await query(
    `SELECT s.id, s.patient_id, st.form_id
     FROM sessions s
     JOIN session_types st ON st.id = s.session_type_id
     WHERE s.id = $1`,
    [req.params.id]
  );
  if (!session.rows[0]) throw ApiError.notFound("Session not found");
  if (!session.rows[0].form_id) throw ApiError.badRequest("No form linked to this session type");

  const relPath = `/uploads/session-forms/${req.file.filename}`;
  const fileUrl = `${req.protocol}://${req.get("host")}${relPath}`;

  await query(
    `INSERT INTO documents (patient_id, session_id, file_name, file_url, file_type, category, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      session.rows[0].patient_id,
      req.params.id,
      req.file.originalname,
      fileUrl,
      req.file.mimetype,
      "session_form_attachment",
      req.user!.sub,
    ]
  );

  ApiResponse.created(res, {
    file_name: req.file.originalname,
    file_type: req.file.mimetype,
    file_size: req.file.size,
    file_url: fileUrl,
  });
});

export const submitSessionForm = asyncHandler(async (req: Request, res: Response) => {
  const answers: Array<{ question_id: string; answer_text?: string; answer_value?: number; answer_options?: string[] }> = req.body;
  const session = await query(
    `SELECT s.id, st.form_id FROM sessions s
     JOIN session_types st ON st.id = s.session_type_id
     WHERE s.id = $1`,
    [req.params.id]
  );
  if (!session.rows[0]) throw ApiError.notFound("Session not found");
  const form_id = session.rows[0].form_id;
  if (!form_id) throw ApiError.badRequest("No form linked to this session type");

  await withTransaction(async (client) => {
    for (const a of answers) {
      await client.query(
        `INSERT INTO session_form_responses (session_id, form_id, question_id, answer_text, answer_value, answer_options)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [req.params.id, form_id, a.question_id,
        a.answer_text ?? null, a.answer_value ?? null,
        a.answer_options ? JSON.stringify(a.answer_options) : null]
      );
    }
  });
  ApiResponse.created(res, null, "Form submitted");
});

export const updateSessionForm = asyncHandler(async (req: Request, res: Response) => {
  const answers: Array<{ question_id: string; answer_text?: string; answer_value?: number; answer_options?: string[] }> = req.body;
  await withTransaction(async (client) => {
    for (const a of answers) {
      await client.query(
        `UPDATE session_form_responses
         SET answer_text = $1, answer_value = $2, answer_options = $3
         WHERE session_id = $4 AND question_id = $5`,
        [a.answer_text ?? null, a.answer_value ?? null,
        a.answer_options ? JSON.stringify(a.answer_options) : null,
        req.params.id, a.question_id]
      );
    }
  });
  ApiResponse.ok(res, null, "Form updated");
});
