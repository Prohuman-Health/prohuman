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

// Per-patient assignments
router.get(   "/:patientId/labels",             c.getPatientLabels);
router.post(  "/:patientId/labels",             c.assignLabel);
router.delete("/:patientId/labels/:labelId",    c.removeLabel);

export default router;
