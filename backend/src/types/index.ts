/** Shared TypeScript types matching the DB schema */

export type Role = "admin" | "receptionist" | "doctor" | "physiotherapist" | "massager" | "fitness_trainer";

export type Gender = "Male" | "Female" | "Other";
export type SessionStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show"
  | "late-cancellation"
  | "rescheduled";
export type AttendanceStatus =
  | "attended"
  | "no-show"
  | "late-cancellation"
  | "rescheduled";
export type PaymentStatus = "pending" | "paid" | "waived";
export type TreatmentPlanStatus = "active" | "completed" | "closed";
export type WaitlistStatus = "waiting" | "notified" | "booked" | "expired";
export type AnswerType = "free_text" | "yes_no" | "scale" | "multiple_choice" | "file_upload";
export type ReferralSourceType = "self" | "gp" | "specialist" | "hospital" | "internal";
export type RecurrencePattern = "daily" | "weekly" | "biweekly" | "custom";

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  operating_hours: Record<string, { open: string; close: string }>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Staff {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  phone: string | null;
  branch_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Doctor {
  id: string;
  staff_id: string;
  specialty: string | null;
  bio: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DoctorAvailability {
  id: string;
  doctor_id: string;
  branch_id: string;
  day_of_week: number; // 0=Sun … 6=Sat
  start_time: string;  // HH:MM
  end_time: string;
  is_active: boolean;
}

export interface Patient {
  id: string;
  patient_code: string;
  full_name: string;
  age: number;
  gender: Gender;
  phone: string;
  email: string | null;
  complaints: string;
  referral_source: ReferralSourceType | null;
  referral_details: string | null;
  branch_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SessionType {
  id: string;
  name: string;
  description: string | null;
  default_duration_minutes: number;
  fee: number;
  form_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Question {
  id: string;
  text: string;
  answer_type: AnswerType;
  options: string[] | null;       // for multiple_choice
  scale_min: number | null;
  scale_max: number | null;
  tags: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Form {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface FormQuestion {
  form_id: string;
  question_id: string;
  order_index: number;
  is_required: boolean;
}

export interface Session {
  id: string;
  patient_id: string;
  doctor_id: string;
  branch_id: string;
  session_type_id: string;
  scheduled_at: Date;
  duration_minutes: number;
  status: SessionStatus;
  attendance: AttendanceStatus | null;
  pre_session_notes: string | null;
  series_id: string | null;
  treatment_plan_id: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface SessionFormResponse {
  id: string;
  session_id: string;
  form_id: string;
  question_id: string;
  answer_text: string | null;
  answer_value: number | null;
  answer_options: string[] | null;
  created_at: Date;
}

export interface TreatmentPlan {
  id: string;
  patient_id: string;
  doctor_id: string;
  goal: string;
  planned_sessions: number;
  completed_sessions: number;
  start_date: Date;
  target_end_date: Date | null;
  status: TreatmentPlanStatus;
  discharge_summary: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: string;
  session_id: string;
  patient_id: string;
  amount: number;
  status: PaymentStatus;
  paid_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WaitlistEntry {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  branch_id: string;
  session_type_id: string | null;
  preferred_dates: string[] | null;
  status: WaitlistStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ConsentRecord {
  id: string;
  patient_id: string;
  template_id: string;
  signed_at: Date;
  signature_data: string | null;
  created_at: Date;
}

export interface ConsentTemplate {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  patient_id: string;
  session_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string;
  category: string | null;
  uploaded_by: string;
  created_at: Date;
}

// ── Admin-configurable flexibility types ────────────────────────────────────

export interface Setting {
  id: string;
  branch_id: string | null;  // null = global
  key: string;
  value: unknown;             // JSONB — can be string, number, boolean, array
  description: string | null;
  updated_by: string | null;
  updated_at: Date;
}

export type FieldInputType = "text" | "number" | "boolean" | "date" | "select" | "multiselect";
export type FieldEntity = "patient" | "session";

export interface CustomFieldDefinition {
  id: string;
  entity: FieldEntity;
  label: string;
  field_key: string;
  input_type: FieldInputType;
  options: string[] | null;
  is_required: boolean;
  is_active: boolean;
  order_index: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomFieldValue {
  id: string;
  field_def_id: string;
  patient_id: string | null;
  session_id: string | null;
  value: unknown;
  created_at: Date;
  updated_at: Date;
}

export type NotificationChannel = "email" | "sms" | "whatsapp" | "in_app";
export type NotificationTrigger =
  | "session_booked"
  | "session_reminder_24h"
  | "session_reminder_1h"
  | "session_cancelled"
  | "session_rescheduled"
  | "waitlist_slot_available"
  | "session_assigned_doctor"
  | "form_pending_completion"
  | "invoice_generated"
  | "consent_form_request";

export interface NotificationTemplate {
  id: string;
  trigger: NotificationTrigger;
  channel: NotificationChannel;
  subject: string | null;
  body: string;               // supports {{placeholder}} tokens
  is_active: boolean;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BillingPackage {
  id: string;
  session_type_id: string | null;
  name: string;
  session_count: number;
  total_price: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PatientPackage {
  id: string;
  patient_id: string;
  package_id: string;
  sessions_remaining: number;
  purchased_at: Date;
  expires_at: Date | null;
  is_active: boolean;
}

export interface InsuranceRecord {
  id: string;
  patient_id: string;
  provider: string;
  policy_number: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/** JWT payload */
export interface JwtPayload {
  sub: string;   // staff.id
  role: Role;
  branchId: string | null;
}

/** Express Request extension */
declare global {
  namespace Express {
    // Make Passport's req.user compatible with our JWT payload shape
    interface User extends JwtPayload { }
    interface Request {
      user?: JwtPayload;
      file?: {
        filename: string;
        originalname: string;
        mimetype: string;
        size: number;
      };
    }
  }
}
