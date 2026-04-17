import { Router } from "express";
import * as c from "../controllers/sessions.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";

export const createSessionSchema = z.object({
  patient_id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  session_type_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().int().min(5).optional(),
  pre_session_notes: z.string().optional(),
  treatment_plan_id: z.string().uuid().optional(),
  // Recurrence (optional)
  recurrence: z.object({
    pattern: z.enum(["daily", "weekly", "biweekly", "custom"]),
    interval_days: z.number().int().min(1).optional(),
    total_sessions: z.number().int().min(2).max(52),
  }).optional(),
});

export const attendanceSchema = z.object({
  attendance: z.enum(["attended", "no-show", "late-cancellation", "rescheduled"]),
});

export const cancelSchema = z.object({
  reason: z.string().min(1),
  cancel_series: z.boolean().optional().default(false),
});

export const rescheduleSchema = z.object({
  scheduled_at: z.string().datetime(),
  doctor_id: z.string().uuid().optional(),
  reason: z.string().optional(),
  reschedule_series: z.boolean().optional().default(false),
});

export const formResponseSchema = z.array(z.object({
  question_id: z.string().uuid(),
  answer_text: z.string().optional(),
  answer_value: z.number().optional(),
  answer_options: z.array(z.string()).optional(),
}));

const FORM_UPLOAD_DIR = path.join(process.cwd(), "uploads", "session-forms");
if (!fs.existsSync(FORM_UPLOAD_DIR)) fs.mkdirSync(FORM_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FORM_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const clean = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${clean}`);
  },
});

const allowedMimePrefixes = ["image/", "video/"];
const allowedMimeExact = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = allowedMimePrefixes.some(prefix => file.mimetype.startsWith(prefix)) || allowedMimeExact.has(file.mimetype);
    cb(ok ? null : new Error("Unsupported file type"), ok);
  },
});

const router = Router();
router.use(authenticate);

router.get("/", c.listSessions);
router.post("/", validate(createSessionSchema), c.createSession);
router.get("/:id", c.getSession);
router.patch("/:id/cancel", validate(cancelSchema), c.cancelSession);
router.patch("/:id/reschedule", validate(rescheduleSchema), c.rescheduleSession);
router.patch("/:id/attendance", validate(attendanceSchema), c.markAttendance);
router.get("/:id/form", c.getSessionForm);
router.post("/:id/form-upload", upload.single("file"), c.uploadSessionFormFile);
router.post("/:id/form", validate(formResponseSchema), c.submitSessionForm);
router.patch("/:id/form", validate(formResponseSchema), c.updateSessionForm);

export default router;
