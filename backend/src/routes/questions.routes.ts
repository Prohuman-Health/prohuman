import { Router } from "express";
import * as c from "../controllers/questions.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const questionSchema = z.object({
  text:        z.string().min(1),
  answer_type: z.enum(["free_text","yes_no","scale","multiple_choice","file_upload","drawing_pad"]),
  options:     z.array(z.string()).optional(),
  scale_min:   z.number().int().optional(),
  scale_max:   z.number().int().optional(),
  tags:        z.array(z.string()).optional().default([]),
  category:    z.string().optional(),
  treatment_tags: z.array(z.string()).optional(),
  body_regions: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

const questionRefinedSchema = questionSchema.refine(d => {
  if (d.answer_type === "multiple_choice") return (d.options?.length ?? 0) >= 2;
  if (d.answer_type === "scale") return d.scale_min !== undefined && d.scale_max !== undefined;
  return true;
}, { message: "Invalid options/scale for answer type" });

const router = Router();
router.use(authenticate);

router.get(   "/",     c.listQuestions);     // ?q=search&tag=tag&type=type
router.post(  "/",     authorize("admin"), validate(questionRefinedSchema),           c.createQuestion);
router.get(   "/:id",  c.getQuestion);
router.patch( "/:id",  authorize("admin"), validate(questionSchema.partial()), c.updateQuestion);
router.delete("/:id",  authorize("admin"),                                     c.retireQuestion);
router.get(   "/:id/forms", c.getQuestionUsage);   // which forms use this question

export default router;
