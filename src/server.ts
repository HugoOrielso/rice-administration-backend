import express from "express";
import authRouter from "./router/auth.routes";
import cors from "cors";
import productsRouter from "./router/products.routes";
import path from "node:path";
import fs from "node:fs";
import uploadRoutes from "./router/uploads.routes";

const app = express();

const UPLOAD_BASE_DIR =
  process.env.UPLOAD_DIR ||
  (process.env.NODE_ENV === "production"
    ? "/data/uploads"
    : path.resolve("uploads"));

fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
fs.mkdirSync(path.join(UPLOAD_BASE_DIR, "products"), { recursive: true });

app.use("/uploads", express.static(UPLOAD_BASE_DIR));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/uploads", uploadRoutes);

export default app;