import { Router } from "express";
import * as c from "../controllers/cash.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

const debitSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  amount:      z.number().positive(),
  description: z.string().min(1).max(300),
});

const router = Router();
router.use(authenticate);

// Both admin and receptionist can read and add debits
router.get(    "/summary",      authorize("admin", "receptionist"), c.getCashSummary);
router.post(   "/debits",       authorize("admin", "receptionist"), validate(debitSchema), c.createDebit);
// Only admin can delete a debit
router.delete( "/debits/:id",   authorize("admin"),                  c.deleteDebit);

export default router;
