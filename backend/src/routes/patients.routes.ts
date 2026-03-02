import { Router } from "express";
import * as c from "../controllers/patients.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const patientSchema = z.object({
  full_name:        z.string().min(1).max(120),
  age:              z.number().int().min(1).max(130),
  gender:           z.enum(["Male", "Female", "Other"]),
  phone:            z.string().min(1),
  email:            z.string().email().optional(),
  complaints:       z.string().min(1),
  referral_source:  z.enum(["self","gp","specialist","hospital","internal"]).optional(),
  referral_details: z.string().optional(),
  branch_id:        z.string().uuid().optional(),
  // custom_fields: Record<string, unknown> — validated dynamically per admin config
  custom_fields:    z.record(z.unknown()).optional(),
});

const router = Router();
router.use(authenticate);

router.get(   "/",           c.listPatients);
router.post(  "/",           validate(patientSchema),           c.createPatient);
router.get(   "/search",     c.searchPatients);              // ?q=name|phone
router.get(   "/:id",        c.getPatient);
router.patch( "/:id",        validate(patientSchema.partial()), c.updatePatient);
router.delete("/:id",        authorize("admin"),                c.deactivatePatient);

// Patient sub-resources
router.get("/:id/sessions",        c.getPatientSessions);
router.get("/:id/treatment-plans", c.getPatientTreatmentPlans);
router.get("/:id/invoices",        c.getPatientInvoices);
router.get("/:id/documents",       c.getPatientDocuments);
router.get("/:id/consent",         c.getPatientConsent);
router.get("/:id/timeline",        c.getPatientTimeline);   // full history

export default router;
