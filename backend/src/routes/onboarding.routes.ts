import { Router } from "express";
import { getStatus, complete } from "../controllers/onboarding.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/status", authenticate, getStatus);
router.post("/complete", authenticate, complete);

export default router;
