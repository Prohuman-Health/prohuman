import { Router } from "express";
import * as c from "../controllers/calendar.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

const availabilityQuerySchema = z.object({
  branch_id:       z.string().uuid(),
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  session_type_id: z.string().uuid().optional(),
  duration_minutes:z.string().optional(),
});

const router = Router();
router.use(authenticate);

// Calendar view — sessions for a given date range
router.get("/sessions",     c.getCalendarSessions);   // ?branch_id=&from=&to=&doctor_id=

// Available doctor slots for a given date (real-time availability check)
router.get("/availability", validate(availabilityQuerySchema, "query"), c.getAvailableSlots);

// Doctor's personal daily schedule
router.get("/my-schedule",  c.getMySchedule);          // ?date= (used by logged-in doctor)

export default router;
