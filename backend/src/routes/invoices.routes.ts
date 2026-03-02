import { Router } from "express";
import * as c from "../controllers/invoices.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const updateInvoiceSchema = z.object({
  status: z.enum(["pending","paid","waived"]),
  notes:  z.string().optional(),
});

const router = Router();
router.use(authenticate);

router.get(   "/",      c.listInvoices);     // ?patient_id=&status=&from=&to=
router.get(   "/:id",   c.getInvoice);
router.patch( "/:id",   authorize("admin","receptionist"), validate(updateInvoiceSchema), c.updateInvoice);

export default router;
