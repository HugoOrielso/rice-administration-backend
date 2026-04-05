import { Router } from "express";
import { getMe, loginUser, logoutUser, refreshSession, registerUser } from "../controllers/auth/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.post("/refresh", refreshSession);
authRouter.post("/logout", logoutUser);
authRouter.post("/logout", logoutUser);
authRouter.get("/me", requireAuth, getMe);


export default authRouter;