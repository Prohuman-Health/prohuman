import { Router } from "express";
import * as c from "../controllers/staff.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const createStaffSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(8),
  full_name: z.string().min(1).max(120),
  role:      z.enum(["admin", "receptionist", "doctor"]),
  phone:     z.string().optional(),
  branch_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
});

const router = Router();

// Self-service password change — any authenticated user can change their own password
router.patch("/:id/password", authenticate, c.setStaffPassword);

router.use(authenticate, authorize("admin"));

router.get(   "/",          c.listStaff);
router.post(  "/",          validate(createStaffSchema), c.createStaff);
router.get(   "/:id",        c.getStaff);
router.patch( "/:id",          validate(createStaffSchema.partial()), c.updateStaff);
router.delete("/:id",          c.deactivateStaff);
router.delete("/:id/revoke", c.deleteAndRevokeStaff);

export default router;
