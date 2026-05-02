import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
    listWhatsappTemplates, getWhatsappTemplate, getTemplateByTrigger,
    updateWhatsappTemplate, previewTemplate, toggleTemplateActive, sendProjectReminder,
    getWhatsappAuthStatus, generateWhatsappQr, logoutWhatsappAuth,
    listNotificationRules, createNotificationRule, updateNotificationRule, deleteNotificationRule,
} from "../controllers/whatsapp.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

const reminderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many reminder send attempts. Please try again later." },
});

router.use(authenticate);

router.get("/auth/status", requireRole("admin"), getWhatsappAuthStatus);
router.post("/auth/qr", requireRole("admin"), generateWhatsappQr);
router.post("/auth/logout", requireRole("admin"), logoutWhatsappAuth);

router.get("/", listWhatsappTemplates);
router.get("/trigger/:trigger", getTemplateByTrigger);

// ── Notification rules (must be before /:id to avoid shadowing) ────────────
router.get("/rules", requireRole("admin"), listNotificationRules);
router.post("/rules", requireRole("admin"), createNotificationRule);
router.patch("/rules/:id", requireRole("admin"), updateNotificationRule);
router.delete("/rules/:id", requireRole("admin"), deleteNotificationRule);

router.get("/:id", getWhatsappTemplate);
router.patch("/:id", requireRole("admin"), updateWhatsappTemplate);
router.post("/:id/preview", requireRole("admin"), previewTemplate);
router.post("/bulk/toggle", requireRole("admin"), toggleTemplateActive);
router.post("/reminders/send", requireRole("admin"), reminderLimiter, sendProjectReminder);

export default router;
