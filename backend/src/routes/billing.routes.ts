import { Router } from "express";
import * as c from "../controllers/billing.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const packageSchema = z.object({
  session_type_id: z.string().uuid().optional().nullable(),
  name:            z.string().min(1).max(120),
  session_count:   z.number().int().min(2),
  total_price:     z.number().min(0),
  is_active:       z.boolean().optional().default(true),
});

export const assignPackageSchema = z.object({
  patient_id:  z.string().uuid(),
  package_id:  z.string().uuid(),
  expires_at:  z.string().datetime().optional(),
});

export const insuranceSchema = z.object({
  patient_id:    z.string().uuid(),
  provider:      z.string().min(1).max(120),
  policy_number: z.string().optional(),
  notes:         z.string().optional(),
});

const router = Router();
router.use(authenticate);

// Packages (admin manages, receptionist reads)
router.get(   "/packages",        c.listPackages);
router.post(  "/packages",        authorize("admin"), validate(packageSchema),           c.createPackage);
router.patch( "/packages/:id",    authorize("admin"), validate(packageSchema.partial()), c.updatePackage);
router.delete("/packages/:id",    authorize("admin"),                                   c.deactivatePackage);

// Assign a package to a patient
router.post(  "/patient-packages",     authorize("admin","receptionist"), validate(assignPackageSchema), c.assignPackage);
router.get(   "/patient-packages",     c.listPatientPackages);             // ?patient_id=
router.delete("/patient-packages/:id", authorize("admin"),                 c.revokePatientPackage);

// Insurance records
router.get(   "/insurance",      c.listInsurance);                         // ?patient_id=
router.post(  "/insurance",      validate(insuranceSchema),                c.createInsurance);
router.patch( "/insurance/:id",  validate(insuranceSchema.partial()),      c.updateInsurance);
router.delete("/insurance/:id",  authorize("admin"),                       c.deleteInsurance);

// Reports
router.get("/reports/summary",   authorize("admin"), c.billingSummary);   // ?from=&to=&branch_id=
router.get("/reports/patient/:patientId", c.patientBillingSummary);

export default router;
