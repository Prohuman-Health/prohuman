import { Router } from "express";
import * as c from "../controllers/waitlist.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const waitlistSchema = z.object({
  patient_id:      z.string().uuid(),
  doctor_id:       z.string().uuid().optional(),
  branch_id:       z.string().uuid(),
  session_type_id: z.string().uuid().optional(),
  preferred_dates: z.array(z.string()).optional(),
  notes:           z.string().optional(),
});

const router = Router();
router.use(authenticate);

router.get(   "/",      c.listWaitlist);
router.post(  "/",      validate(waitlistSchema),           c.addToWaitlist);
router.get(   "/:id",   c.getWaitlistEntry);
router.patch( "/:id",   validate(waitlistSchema.partial()), c.updateWaitlistEntry);
router.delete("/:id",   c.removeFromWaitlist);
router.post(  "/:id/notify", c.notifyWaitlistPatient);

export default router;
