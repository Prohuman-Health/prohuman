import { Router } from "express";
import {
    listAlgorithms, getAlgorithm, createAlgorithm, updateAlgorithm,
    deleteAlgorithm, upsertAlgorithmExercises, applyAlgorithmToPatient, getPatientAlgorithms
} from "../controllers/algorithms.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", listAlgorithms);
router.get("/:id", getAlgorithm);
router.post("/", requireRole("admin"), createAlgorithm);
router.patch("/:id", requireRole("admin"), updateAlgorithm);
router.delete("/:id", requireRole("admin"), deleteAlgorithm);
router.put("/:id/exercises", requireRole("admin"), upsertAlgorithmExercises);
router.post("/:id/apply", applyAlgorithmToPatient);
router.get("/patient/:patientId", getPatientAlgorithms);

export default router;
