import { Router } from "express";
import * as c from "../controllers/sessionTypes.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const sessionTypeSchema = z.object({
  name:                     z.string().min(1).max(120),
  description:              z.string().optional(),
  default_duration_minutes: z.number().int().min(1).default(60),
  fee:                      z.number().min(0),
  form_id:                  z.string().uuid().optional().nullable(),
  is_active:                z.boolean().optional().default(true),
});

const router = Router();
router.use(authenticate);

router.get(   "/",     c.listSessionTypes);
router.post(  "/",     authorize("admin"), validate(sessionTypeSchema),           c.createSessionType);
router.get(   "/:id",  c.getSessionType);
router.patch( "/:id",  authorize("admin"), validate(sessionTypeSchema.partial()), c.updateSessionType);
router.delete("/:id",  authorize("admin"),                                        c.archiveSessionType);

export default router;
