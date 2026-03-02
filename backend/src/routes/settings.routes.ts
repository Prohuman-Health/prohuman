import { Router } from "express";
import * as c from "../controllers/settings.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const upsertSettingSchema = z.object({
  key:         z.string().min(1).max(120),
  value:       z.unknown(),
  description: z.string().optional(),
  branch_id:   z.string().uuid().optional().nullable(),
});

export const bulkUpsertSchema = z.array(upsertSettingSchema);

const router = Router();
router.use(authenticate);

router.get(  "/",     c.listSettings);                                   // ?branch_id= (null = global)
router.get(  "/:key", c.getSetting);
router.put(  "/",     authorize("admin"), validate(bulkUpsertSchema),    c.bulkUpsertSettings);  // batch update
router.put(  "/:key", authorize("admin"), validate(upsertSettingSchema), c.upsertSetting);
router.delete("/:key",authorize("admin"),                                c.deleteSetting);

export default router;
