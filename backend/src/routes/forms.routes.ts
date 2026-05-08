import { Router } from "express";
import * as c from "../controllers/forms.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const formSchema = z.object({
  title:       z.string().min(1).max(180),
  description: z.string().optional(),
});

export const formQuestionsSchema = z.array(z.object({
  question_id:  z.string().uuid(),
  order_index:  z.number().int().min(0),
  is_required:  z.boolean().optional().default(true),
}));

const router = Router();
router.use(authenticate);

router.get(   "/",                  c.listForms);
router.post(  "/",                  authorize("admin"), validate(formSchema),          c.createForm);
router.get(   "/:id",               c.getForm);           // includes questions
router.patch( "/:id",               authorize("admin"), validate(formSchema.partial()), c.updateForm);
router.delete("/:id",               authorize("admin"), c.deleteForm);
router.put(   "/:id/archive",       authorize("admin"), c.archiveForm);
router.put(   "/:id/publish",       authorize("admin"), c.publishForm);
router.put(   "/:id/questions",     authorize("admin"), validate(formQuestionsSchema),  c.setFormQuestions);  // full replace
router.patch( "/:id/questions",     authorize("admin"), validate(formQuestionsSchema),  c.addFormQuestions);  // append/update

export default router;
