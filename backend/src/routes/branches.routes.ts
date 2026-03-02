import { Router } from "express";
import * as c from "../controllers/branches.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize }    from "../middleware/auth.middleware";
import { validate }     from "../middleware/validate.middleware";
import { z } from "zod";

const operatingHoursSchema = z.record(
  z.object({ open: z.string(), close: z.string() })
);

export const branchSchema = z.object({
  name:             z.string().min(1).max(120),
  address:          z.string().min(1),
  phone:            z.string().optional(),
  email:            z.string().email().optional(),
  operating_hours:  operatingHoursSchema.optional().default({}),
});

const router = Router();
router.use(authenticate);

router.get(   "/",      c.listBranches);
router.post(  "/",      authorize("admin"),               validate(branchSchema),  c.createBranch);
router.get(   "/:id",   c.getBranch);
router.patch( "/:id",   authorize("admin"),               validate(branchSchema.partial()), c.updateBranch);
router.delete("/:id",   authorize("admin"),               c.deleteBranch);

export default router;
