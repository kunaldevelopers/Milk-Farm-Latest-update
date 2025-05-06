import { Router } from "express";
import { login, register } from "../controllers/auth";

const router = Router();

router.post("/login", login as any);
router.post("/register", register as any);

export const authRouter = router;
