import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";

export const getCalendarSessions = asyncHandler(async (req: Request, res: Response) => {
  const { branch_id, from, to, doctor_id } = req.query as Record<string, string>;
  const conditions = ["s.branch_id = $1"]; const vals: unknown[] = [branch_id]; let i = 2;
  if (from)      { conditions.push(`s.scheduled_at >= $${i++}`); vals.push(from); }
  if (to)        { conditions.push(`s.scheduled_at <= $${i++}`); vals.push(to); }
  if (doctor_id) { conditions.push(`s.doctor_id = $${i++}`);     vals.push(doctor_id); }
  conditions.push(`s.status NOT IN ('cancelled')`);

  const result = await query(
    `SELECT s.id, s.scheduled_at, s.duration_minutes, s.status, s.attendance,
            p.full_name AS patient_name, p.patient_code,
            sf.full_name AS doctor_name,
            st.name AS session_type, st.id AS session_type_id
     FROM sessions s
     JOIN patients p       ON p.id = s.patient_id
     JOIN doctors d        ON d.id = s.doctor_id
     JOIN staff sf         ON sf.id = d.staff_id
     JOIN session_types st ON st.id = s.session_type_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.scheduled_at`,
    vals
  );
  ApiResponse.ok(res, result.rows);
});

export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
  const { branch_id, date, session_type_id, duration_minutes = "60" } = req.query as Record<string, string>;
  const dayOfWeek = new Date(date).getDay();

  const closed = await query(
    `SELECT id FROM clinic_closures
     WHERE closure_date = $1::date AND is_active = TRUE
     LIMIT 1`,
    [date]
  );
  if (closed.rows[0]) {
    ApiResponse.ok(res, []);
    return;
  }

  // Get doctors available on this day at this branch
  const doctors = await query<{ doctor_id: string; start_time: string; end_time: string; doctor_name: string; specialty: string }>(
    `SELECT da.doctor_id, da.start_time, da.end_time,
            sf.full_name AS doctor_name, d.specialty
     FROM doctor_availability da
     JOIN doctors d ON d.id = da.doctor_id
     JOIN staff sf  ON sf.id = d.staff_id
     WHERE da.branch_id = $1 AND da.day_of_week = $2 AND da.is_active = TRUE AND sf.is_active = TRUE`,
    [branch_id, dayOfWeek]
  );

  // Get already booked sessions that day for each doctor
  const dateStart = `${date} 00:00:00`;
  const dateEnd   = `${date} 23:59:59`;
  const booked = await query<{ doctor_id: string; scheduled_at: string; duration_minutes: number }>(
    `SELECT doctor_id, scheduled_at, duration_minutes FROM sessions
     WHERE branch_id = $1 AND scheduled_at BETWEEN $2 AND $3 AND status NOT IN ('cancelled')`,
    [branch_id, dateStart, dateEnd]
  );
  const bookedByDoctor = new Map<string, Array<{ start: Date; end: Date }>>();
  for (const b of booked.rows) {
    const start = new Date(b.scheduled_at);
    const end = new Date(start.getTime() + b.duration_minutes * 60_000);
    if (!bookedByDoctor.has(b.doctor_id)) bookedByDoctor.set(b.doctor_id, []);
    bookedByDoctor.get(b.doctor_id)!.push({ start, end });
  }

  const slotDuration = parseInt(duration_minutes, 10);
  const result: Array<{ doctor_id: string; doctor_name: string; specialty: string; slots: string[] }> = [];

  for (const doc of doctors.rows) {
    const [startH, startM] = doc.start_time.split(":").map(Number);
    const [endH, endM]     = doc.end_time.split(":").map(Number);
    const available: string[] = [];
    const docBooked = bookedByDoctor.get(doc.doctor_id) ?? [];

    for (let h = startH, m = startM; h * 60 + m + slotDuration <= endH * 60 + endM;) {
      const slotStart = new Date(`${date}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`);
      const slotEnd   = new Date(slotStart.getTime() + slotDuration * 60_000);

      const overlaps = docBooked.some(b =>
        slotStart < b.end && slotEnd > b.start
      );

      if (!overlaps) available.push(slotStart.toISOString());

      m += 30;
      if (m >= 60) { h++; m -= 60; }
    }
    if (available.length) {
      result.push({ doctor_id: doc.doctor_id, doctor_name: doc.doctor_name, specialty: doc.specialty, slots: available });
    }
  }

  ApiResponse.ok(res, result);
});

export const listClinicClosures = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string>;
  const conditions = ["is_active = TRUE"];
  const vals: unknown[] = [];
  let i = 1;

  if (from) {
    conditions.push(`closure_date >= $${i++}::date`);
    vals.push(from);
  }
  if (to) {
    conditions.push(`closure_date <= $${i++}::date`);
    vals.push(to);
  }

  const result = await query(
    `SELECT id, closure_date, reason, created_at, updated_at
     FROM clinic_closures
     WHERE ${conditions.join(" AND ")}
     ORDER BY closure_date`,
    vals
  );
  ApiResponse.ok(res, result.rows);
});

export const createClinicClosure = asyncHandler(async (req: Request, res: Response) => {
  const { closure_date, reason } = req.body as { closure_date: string; reason?: string };
  const result = await query(
    `INSERT INTO clinic_closures (closure_date, reason, created_by)
     VALUES ($1::date, $2, $3)
     ON CONFLICT (closure_date)
     DO UPDATE SET
       reason = EXCLUDED.reason,
       is_active = TRUE,
       updated_at = NOW()
     RETURNING id, closure_date, reason, created_at, updated_at`,
    [closure_date, reason?.trim() || null, req.user?.sub ?? null]
  );
  ApiResponse.created(res, result.rows[0]);
});

export const updateClinicClosure = asyncHandler(async (req: Request, res: Response) => {
  const fields = req.body as { closure_date?: string; reason?: string; is_active?: boolean };
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  if (fields.closure_date !== undefined) {
    sets.push(`closure_date = $${i++}::date`);
    vals.push(fields.closure_date);
  }
  if (fields.reason !== undefined) {
    sets.push(`reason = $${i++}`);
    vals.push(fields.reason.trim() || null);
  }
  if (fields.is_active !== undefined) {
    sets.push(`is_active = $${i++}`);
    vals.push(fields.is_active);
  }

  if (!sets.length) return ApiResponse.ok(res, null, "Nothing to update");

  vals.push(req.params.id);
  const result = await query(
    `UPDATE clinic_closures
     SET ${sets.join(", ")}, updated_at = NOW()
     WHERE id = $${i}
     RETURNING id, closure_date, reason, created_at, updated_at, is_active`,
    vals
  );
  ApiResponse.ok(res, result.rows[0]);
});

export const deleteClinicClosure = asyncHandler(async (req: Request, res: Response) => {
  await query(
    `UPDATE clinic_closures
     SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1`,
    [req.params.id]
  );
  ApiResponse.noContent(res);
});

export const getMySchedule = asyncHandler(async (req: Request, res: Response) => {
  const { date = new Date().toISOString().slice(0,10) } = req.query as Record<string, string>;
  const user = req.user!;

  const doctorRow = await query(
    "SELECT d.id FROM doctors d JOIN staff s ON s.id = d.staff_id WHERE s.id = $1",
    [user.sub]
  );
  if (!doctorRow.rows[0]) {
    ApiResponse.ok(res, []);
    return;
  }
  const doctor_id = doctorRow.rows[0].id;

  const result = await query(
    `SELECT s.id, s.scheduled_at, s.duration_minutes, s.status, s.attendance,
            p.full_name AS patient_name, p.patient_code,
            st.name AS session_type, st.form_id,
            b.name AS branch_name
     FROM sessions s
     JOIN patients p       ON p.id = s.patient_id
     JOIN session_types st ON st.id = s.session_type_id
     JOIN branches b       ON b.id = s.branch_id
     WHERE s.doctor_id = $1
       AND s.scheduled_at::date = $2::date
       AND s.status NOT IN ('cancelled')
     ORDER BY s.scheduled_at`,
    [doctor_id, date]
  );
  ApiResponse.ok(res, result.rows);
});
