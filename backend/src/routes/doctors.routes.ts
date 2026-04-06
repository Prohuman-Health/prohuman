import { Router } from "express";
import * as c from "../controllers/doctors.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const availabilitySchema = z.object({
  branch_id:   z.string().uuid(),
  day_of_week: z.number().int().min(0).max(6),
  start_time:  z.string().regex(/^\d{2}:\d{2}$/),
  end_time:    z.string().regex(/^\d{2}:\d{2}$/),
  label:       z.string().max(60).optional(),
  is_active:   z.boolean().optional().default(true),
});

const router = Router();
router.use(authenticate);

router.get(   "/",                         c.listDoctors);
router.get(   "/:id",                      c.getDoctor);
router.patch( "/:id",   authorize("admin"), validate(z.object({ specialty: z.string().optional(), bio: z.string().optional() })), c.updateDoctor);

// Availability management (admin-only)
router.get(   "/:id/availability",                        c.getDoctorAvailability);
router.put(   "/:id/availability",   authorize("admin"),  validate(z.array(availabilitySchema)), c.setDoctorAvailability);
router.post(  "/:id/availability",   authorize("admin"),  validate(availabilitySchema), c.addAvailabilitySlot);
router.patch( "/:id/availability/:avId", authorize("admin"), validate(availabilitySchema.partial()), c.updateAvailabilitySlot);
router.delete("/:id/availability/:avId", authorize("admin"), c.deleteAvailabilitySlot);

export default router;
