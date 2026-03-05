import { Router } from "express";
import {
    getPatientBalance, getPatientLedger, awardSessionPoints,
    awardReferralPoints, redeemPoints, adjustPoints
} from "../controllers/points.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/patient/:patientId/balance", getPatientBalance);
router.get("/patient/:patientId/ledger", getPatientLedger);
router.post("/award/session", awardSessionPoints);
router.post("/award/referral", awardReferralPoints);
router.post("/redeem", redeemPoints);
router.post("/adjust", requireRole("admin"), adjustPoints);

export default router;
