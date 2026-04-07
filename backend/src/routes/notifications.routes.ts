import { Router } from "express";
import * as c from "../controllers/notifications.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const templateUpdateSchema = z.object({
  subject:   z.string().optional(),
  body:      z.string().min(1),
  is_active: z.boolean().optional(),
});

const router = Router();
router.use(authenticate);

// Templates (admin manages)
router.get(   "/templates",      c.listNotificationTemplates);
router.get(   "/templates/:id",  c.getNotificationTemplate);
// Admin can update content & toggle active — but cannot change trigger/channel (structural)
router.patch( "/templates/:id",  authorize("admin"), validate(templateUpdateSchema), c.updateNotificationTemplate);

// Preview a rendered notification with sample data
router.post("/templates/:id/preview", authorize("admin"), c.previewNotificationTemplate);

// ── In-app inbox ──────────────────────────────────────────────────────────────
router.get(   "/inbox",               c.listInbox);
router.get(   "/inbox/counts",        c.getUnreadCounts);
router.patch( "/inbox/read-all",      c.markAllRead);
router.patch( "/inbox/:id/read",      c.markOneRead);

export default router;
