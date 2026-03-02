import { Router } from "express";
import * as c from "../controllers/customFields.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const fieldDefSchema = z.object({
  entity:      z.enum(["patient","session"]),
  label:       z.string().min(1).max(120),
  field_key:   z.string().regex(/^[a-z_][a-z0-9_]*$/, "Must be snake_case"),
  input_type:  z.enum(["text","number","boolean","date","select","multiselect"]),
  options:     z.array(z.string()).optional(),
  is_required: z.boolean().optional().default(false),
  order_index: z.number().int().min(0).optional().default(0),
});

const router = Router();
router.use(authenticate);

// Field definitions (admin manages)
router.get(   "/definitions",      c.listFieldDefinitions);      // ?entity=patient
router.post(  "/definitions",      authorize("admin"), validate(fieldDefSchema),           c.createFieldDefinition);
router.get(   "/definitions/:id",  c.getFieldDefinition);
router.patch( "/definitions/:id",  authorize("admin"), validate(fieldDefSchema.partial()), c.updateFieldDefinition);
router.delete("/definitions/:id",  authorize("admin"),                                     c.deactivateFieldDefinition);
router.patch( "/definitions/reorder", authorize("admin"), validate(z.array(z.object({ id: z.string().uuid(), order_index: z.number() }))), c.reorderFields);

export default router;
