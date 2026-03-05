import { Router } from "express";
import {
    listWhatsappTemplates, getWhatsappTemplate, getTemplateByTrigger,
    updateWhatsappTemplate, previewTemplate, toggleTemplateActive
} from "../controllers/whatsapp.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", listWhatsappTemplates);
router.get("/trigger/:trigger", getTemplateByTrigger);
router.get("/:id", getWhatsappTemplate);
router.patch("/:id", requireRole("admin"), updateWhatsappTemplate);
router.post("/:id/preview", requireRole("admin"), previewTemplate);
router.post("/bulk/toggle", requireRole("admin"), toggleTemplateActive);

export default router;
