import { Router } from "express";
import * as c from "../controllers/calendar.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

const availabilityQuerySchema = z.object({
  branch_id:       z.string().uuid(),
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  session_type_id: z.string().uuid().optional(),
  duration_minutes:z.string().optional(),
});

const closureSchema = z.object({
  closure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional(),
});

const closureListQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const router = Router();
router.use(authenticate);

// Calendar view — sessions for a given date range
router.get("/sessions",     c.getCalendarSessions);   // ?branch_id=&from=&to=&doctor_id=

// Available doctor slots for a given date (real-time availability check)
router.get("/availability", validate(availabilityQuerySchema, "query"), c.getAvailableSlots);

// Clinic closure days (for closed/public holidays)
router.get("/closures", validate(closureListQuerySchema, "query"), c.listClinicClosures);
router.post("/closures", authorize("admin"), validate(closureSchema), c.createClinicClosure);
router.patch("/closures/:id", authorize("admin"), validate(closureSchema.partial()), c.updateClinicClosure);
router.delete("/closures/:id", authorize("admin"), c.deleteClinicClosure);

// Doctor's personal daily schedule
router.get("/my-schedule",  c.getMySchedule);          // ?date= (used by logged-in doctor)

export default router;
