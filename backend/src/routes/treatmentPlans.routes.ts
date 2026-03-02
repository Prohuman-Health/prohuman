import { Router } from "express";
import * as c from "../controllers/treatmentPlans.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const createPlanSchema = z.object({
  patient_id:       z.string().uuid(),
  doctor_id:        z.string().uuid(),
  goal:             z.string().min(1),
  planned_sessions: z.number().int().min(1),
  start_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  target_end_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const closePlanSchema = z.object({
  discharge_summary: z.string().optional(),
});

const router = Router();
router.use(authenticate);

router.get(   "/",            c.listPlans);
router.post(  "/",            validate(createPlanSchema),          c.createPlan);
router.get(   "/:id",         c.getPlan);
router.patch( "/:id",         validate(createPlanSchema.partial()),c.updatePlan);
router.patch( "/:id/close",   validate(closePlanSchema),           c.closePlan);
router.get(   "/:id/progress",c.getPlanProgress);   // outcome trends

export default router;
