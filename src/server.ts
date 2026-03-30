// src/app.ts
import express from "express";
import authRouter from "./router/auth.routes";

const app = express();

app.use(express.json());

app.use("/api/auth", authRouter);

export default app;