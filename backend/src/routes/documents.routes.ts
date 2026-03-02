import { Router } from "express";
import * as c from "../controllers/documents.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const documentMetaSchema = z.object({
  patient_id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  file_name:  z.string().min(1),
  file_url:   z.string().url(),
  file_type:  z.string().min(1),
  category:   z.string().optional(),
});

const router = Router();
router.use(authenticate);

router.get(   "/",      c.listDocuments);    // ?patient_id=&session_id=
router.post(  "/",      validate(documentMetaSchema), c.uploadDocument);
router.get(   "/:id",   c.getDocument);
router.delete("/:id",   c.deleteDocument);

export default router;
