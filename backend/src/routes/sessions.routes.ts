import { Router } from "express";
import * as c from "../controllers/sessions.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const createSessionSchema = z.object({
  patient_id:        z.string().uuid(),
  doctor_id:         z.string().uuid(),
  branch_id:         z.string().uuid(),
  session_type_id:   z.string().uuid(),
  scheduled_at:      z.string().datetime(),
  duration_minutes:  z.number().int().min(5).optional(),
  pre_session_notes: z.string().optional(),
  treatment_plan_id: z.string().uuid().optional(),
  // Recurrence (optional)
  recurrence: z.object({
    pattern:        z.enum(["daily","weekly","biweekly","custom"]),
    interval_days:  z.number().int().min(1).optional(),
    total_sessions: z.number().int().min(2).max(52),
  }).optional(),
});

export const attendanceSchema = z.object({
  attendance: z.enum(["attended","no-show","late-cancellation","rescheduled"]),
});

export const cancelSchema = z.object({
  reason:        z.string().min(1),
  cancel_series: z.boolean().optional().default(false),
});

export const rescheduleSchema = z.object({
  scheduled_at:     z.string().datetime(),
  doctor_id:        z.string().uuid().optional(),
  reason:           z.string().optional(),
  reschedule_series: z.boolean().optional().default(false),
});

export const formResponseSchema = z.array(z.object({
  question_id:    z.string().uuid(),
  answer_text:    z.string().optional(),
  answer_value:   z.number().optional(),
  answer_options: z.array(z.string()).optional(),
}));

const router = Router();
router.use(authenticate);

router.get(   "/",              c.listSessions);
router.post(  "/",              validate(createSessionSchema), c.createSession);
router.get(   "/:id",           c.getSession);
router.patch( "/:id/cancel",    validate(cancelSchema),        c.cancelSession);
router.patch( "/:id/reschedule",validate(rescheduleSchema),    c.rescheduleSession);
router.patch( "/:id/attendance",validate(attendanceSchema),    c.markAttendance);
router.get(   "/:id/form",      c.getSessionForm);
router.post(  "/:id/form",      validate(formResponseSchema),  c.submitSessionForm);
router.patch( "/:id/form",      validate(formResponseSchema),  c.updateSessionForm);

export default router;
