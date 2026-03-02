import { Router } from "express";
import { login, me, changePassword } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(8),
});

const router = Router();

router.post("/login",           validate(loginSchema),          login);
router.get( "/me",              authenticate,                   me);
router.patch("/me/password",    authenticate, validate(changePasswordSchema), changePassword);

export default router;
