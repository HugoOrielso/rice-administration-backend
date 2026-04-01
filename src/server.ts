import express from "express";
import authRouter from "./router/auth.routes";
import cors from "cors";
import productsRouter from "./router/products.routes";
import path from "node:path";
import uploadRoutes from "./router/uploads.routes";

const app = express();

app.use("/uploads", express.static(path.resolve("uploads")));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/uploads", uploadRoutes);

export default app;