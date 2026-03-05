import { Router } from "express";
import {
    listExercises, getExercise, createExercise,
    updateExercise, deleteExercise, listCategories
} from "../controllers/exercises.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/categories", listCategories);
router.get("/", listExercises);
router.get("/:id", getExercise);
router.post("/", requireRole("admin"), createExercise);
router.patch("/:id", requireRole("admin"), updateExercise);
router.delete("/:id", requireRole("admin"), deleteExercise);

export default router;
