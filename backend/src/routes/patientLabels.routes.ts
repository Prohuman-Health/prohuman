import { Router } from "express";
import * as c from "../controllers/patientLabels.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

// Label definitions (admin only for create/update/delete)
router.get(   "/labels",                        c.listLabels);
router.post(  "/labels",    authorize("admin"), c.createLabel);
router.patch( "/labels/:id", authorize("admin"), c.updateLabel);
router.delete("/labels/:id", authorize("admin"), c.deleteLabel);

// Patient label map (all patients → their labels)
router.get("/labels-map",                       c.listPatientsWithLabels);

// Per-patient assignments + audit
router.get(   "/:patientId/labels",             c.getPatientLabels);
router.get(   "/:patientId/label-audit",        c.getPatientLabelAudit);
router.post(  "/:patientId/labels",             c.assignLabel);
router.delete("/:patientId/labels/:labelId",    c.removeLabel);

// Clinic-wide recent label activity (admin only)
router.get("/label-activity", authorize("admin"), c.getRecentLabelActivity);

export default router;
