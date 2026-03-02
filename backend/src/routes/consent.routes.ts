import { Router } from "express";
import * as c from "../controllers/consent.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const templateSchema = z.object({
  title:     z.string().min(1).max(180),
  content:   z.string().min(1),
  is_active: z.boolean().optional().default(true),
});

export const signConsentSchema = z.object({
  patient_id:     z.string().uuid(),
  template_id:    z.string().uuid(),
  signature_data: z.string().optional(),
});

const router = Router();
router.use(authenticate);

// Templates (admin manages)
router.get(   "/templates",      c.listTemplates);
router.post(  "/templates",      authorize("admin"), validate(templateSchema),           c.createTemplate);
router.get(   "/templates/:id",  c.getTemplate);
router.patch( "/templates/:id",  authorize("admin"), validate(templateSchema.partial()), c.updateTemplate);

// Consent records
router.get( "/records",          c.listConsentRecords);   // ?patient_id=
router.post("/records",          validate(signConsentSchema), c.signConsent);
router.get( "/records/:id",      c.getConsentRecord);

export default router;
