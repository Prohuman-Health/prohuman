import { Request, Response } from "express";
import { query, withTransaction } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

/** Generate next patient code: PH-000042 */
async function generatePatientCode(): Promise<string> {
  const prefixRow = await query(
    "SELECT value FROM settings WHERE key = 'patient_id_prefix' AND branch_id IS NULL"
  );
  const digitsRow = await query(
    "SELECT value FROM settings WHERE key = 'patient_id_digits' AND branch_id IS NULL"
  );
  const prefix = (prefixRow.rows[0]?.value as string ?? "PH").replace(/"/g, "");
  const digits = parseInt(digitsRow.rows[0]?.value as string ?? "6", 10);

  const countRow = await query("SELECT COUNT(*) FROM patients");
  const next = parseInt(countRow.rows[0].count, 10) + 1;
  return `${prefix}-${String(next).padStart(digits, "0")}`;
}

export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const { branch_id, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ["1=1"];
  const vals: unknown[] = [];
  let i = 1;
  if (branch_id) { conditions.push(`branch_id = $${i++}`);  vals.push(branch_id); }
  if (status === "active")     { conditions.push(`is_active = TRUE`); }
  if (status === "discharged") { conditions.push(`is_active = FALSE`); }

  vals.push(parseInt(limit), offset);
  const result = await query(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM patients WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
    vals
  );
  const total = result.rows[0]?.total_count ?? 0;
  ApiResponse.ok(res, { patients: result.rows, total: parseInt(total), page: parseInt(page), limit: parseInt(limit) });
});

export const searchPatients = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query as Record<string, string>;
  if (!q || q.length < 2) throw ApiError.badRequest("Query must be at least 2 characters");
  const result = await query(
    `SELECT id, patient_code, full_name, age, gender, phone, email, is_active
     FROM patients
     WHERE full_name ILIKE $1 OR phone ILIKE $1 OR patient_code ILIKE $1
     ORDER BY full_name LIMIT 20`,
    [`%${q}%`]
  );
  ApiResponse.ok(res, result.rows);
});

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const result = await query("SELECT * FROM patients WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) throw ApiError.notFound("Patient not found");

  // Fetch custom field values
  const custom = await query(
    `SELECT cfd.field_key, cfd.label, cfv.value
     FROM custom_field_values cfv
     JOIN custom_field_definitions cfd ON cfd.id = cfv.field_def_id
     WHERE cfv.patient_id = $1`,
    [req.params.id]
  );

  ApiResponse.ok(res, { ...result.rows[0], custom_fields: custom.rows });
});

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const { full_name, age, gender, phone, email, complaints, referral_source, referral_details, branch_id, custom_fields } = req.body;

  // Duplicate check
  const dup = await query(
    "SELECT id FROM patients WHERE phone = $1 AND full_name ILIKE $2",
    [phone, full_name]
  );
  if (dup.rows[0]) throw ApiError.conflict("A patient with this name and phone already exists");

  const patient_code = await generatePatientCode();

  const patient = await withTransaction(async (client) => {
    const row = await client.query(
      `INSERT INTO patients (patient_code, full_name, age, gender, phone, email, complaints, referral_source, referral_details, branch_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [patient_code, full_name, age, gender, phone, email ?? null, complaints, referral_source ?? null, referral_details ?? null, branch_id ?? null]
    );
    const p = row.rows[0];

    // Persist custom fields
    if (custom_fields && typeof custom_fields === "object") {
      for (const [field_key, value] of Object.entries(custom_fields)) {
        const def = await client.query(
          "SELECT id FROM custom_field_definitions WHERE field_key = $1 AND entity = 'patient' AND is_active = TRUE",
          [field_key]
        );
        if (def.rows[0]) {
          await client.query(
            `INSERT INTO custom_field_values (field_def_id, patient_id, value)
             VALUES ($1,$2,$3)
             ON CONFLICT DO NOTHING`,
            [def.rows[0].id, p.id, JSON.stringify(value)]
          );
        }
      }
    }
    return p;
  });

  ApiResponse.created(res, patient);
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const allowed = ["full_name", "age", "gender", "phone", "email", "complaints", "referral_source", "referral_details", "branch_id"];
  const { custom_fields, ...rest } = req.body;
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(rest)) {
    if (allowed.includes(k)) { sets.push(`${k} = $${i++}`); vals.push(v); }
  }

  await withTransaction(async (client) => {
    if (sets.length) {
      vals.push(req.params.id);
      await client.query(
        `UPDATE patients SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i}`,
        vals
      );
    }
    if (custom_fields && typeof custom_fields === "object") {
      for (const [field_key, value] of Object.entries(custom_fields)) {
        const def = await client.query(
          "SELECT id FROM custom_field_definitions WHERE field_key = $1 AND entity = 'patient' AND is_active = TRUE",
          [field_key]
        );
        if (def.rows[0]) {
          await client.query(
            `INSERT INTO custom_field_values (field_def_id, patient_id, value)
             VALUES ($1,$2,$3)
             ON CONFLICT (field_def_id, patient_id) DO UPDATE SET value = $3, updated_at = NOW()`,
            [def.rows[0].id, req.params.id, JSON.stringify(value)]
          );
        }
      }
    }
  });

  const updated = await query("SELECT * FROM patients WHERE id = $1", [req.params.id]);
  ApiResponse.ok(res, updated.rows[0]);
});

export const deactivatePatient = asyncHandler(async (req: Request, res: Response) => {
  await query("UPDATE patients SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [req.params.id]);
  ApiResponse.noContent(res);
});

export const getPatientSessions = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT s.id, s.scheduled_at, s.duration_minutes, s.status, s.attendance,
            st.name AS session_type, sf.full_name AS doctor_name, b.name AS branch
     FROM sessions s
     JOIN session_types st ON st.id = s.session_type_id
     JOIN doctors d ON d.id = s.doctor_id
     JOIN staff sf ON sf.id = d.staff_id
     JOIN branches b ON b.id = s.branch_id
     WHERE s.patient_id = $1
     ORDER BY s.scheduled_at DESC`,
    [req.params.id]
  );
  ApiResponse.ok(res, result.rows);
});

export const getPatientTreatmentPlans = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT tp.*, s.full_name AS doctor_name
     FROM treatment_plans tp
     JOIN doctors d ON d.id = tp.doctor_id
     JOIN staff s ON s.id = d.staff_id
     WHERE tp.patient_id = $1 ORDER BY tp.start_date DESC`,
    [req.params.id]
  );
  ApiResponse.ok(res, result.rows);
});

export const getPatientInvoices = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    "SELECT * FROM invoices WHERE patient_id = $1 ORDER BY created_at DESC",
    [req.params.id]
  );
  ApiResponse.ok(res, result.rows);
});

export const getPatientDocuments = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    "SELECT * FROM documents WHERE patient_id = $1 ORDER BY created_at DESC",
    [req.params.id]
  );
  ApiResponse.ok(res, result.rows);
});

export const getPatientConsent = asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT cr.*, ct.title AS template_title
     FROM consent_records cr
     JOIN consent_templates ct ON ct.id = cr.template_id
     WHERE cr.patient_id = $1 ORDER BY cr.signed_at DESC`,
    [req.params.id]
  );
  ApiResponse.ok(res, result.rows);
});

export const getPatientTimeline = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await query(
    `SELECT 'session' AS type, s.id, s.scheduled_at AS date, st.name AS label, s.status
     FROM sessions s JOIN session_types st ON st.id = s.session_type_id WHERE s.patient_id = $1`,
    [req.params.id]
  );
  const invoices = await query(
    `SELECT 'invoice' AS type, id, created_at AS date, status AS label, amount FROM invoices WHERE patient_id = $1`,
    [req.params.id]
  );
  const docs = await query(
    `SELECT 'document' AS type, id, created_at AS date, file_name AS label, category FROM documents WHERE patient_id = $1`,
    [req.params.id]
  );

  const timeline = [...sessions.rows, ...invoices.rows, ...docs.rows].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  ApiResponse.ok(res, timeline);
});
