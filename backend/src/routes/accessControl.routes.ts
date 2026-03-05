import { Router } from "express";
import {
    listActivityLog,
    getStaffFormAccess, grantFormAccess, batchUpdateFormAccess,
    checkPatientAccess
} from "../controllers/accessControl.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

// Audit log — admin only
router.get("/audit-log", requireRole("admin"), listActivityLog);

// Patient access check
router.get("/patient-access", checkPatientAccess);

// Form access management per staff member
router.get("/staff/:staffId/forms", requireRole("admin"), getStaffFormAccess);
router.post("/staff/:staffId/forms", requireRole("admin"), grantFormAccess);
router.put("/staff/:staffId/forms", requireRole("admin"), batchUpdateFormAccess);

export default router;
