import { Router } from "express";
import { loginUser, logoutUser, refreshSession, registerUser } from "../modules/auth/controllers/auth.controller";

const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.post("/refresh", refreshSession);
authRouter.post("/logout", logoutUser);


export default authRouter;