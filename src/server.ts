import express from "express";
import authRouter from "./router/auth.routes";
import cors from "cors";
import productsRouter from "./router/products.routes";
import path from "node:path";
import fs from "node:fs";
import uploadRoutes from "./router/uploads.routes";
import paymentsRouter from "./router/payments.routes";
import invoicesRouter from "./router/invoices.routes";
import adminRouter from "./router/admin.routes";

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
    origin: [
      "http://localhost:3000",
      "https://arrozandinagroup.com",
      "https://arrozandinagroup.com",
      "https://theaceous-indorsable-lilliana.ngrok-free.dev"
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/uploads", uploadRoutes);
app.use("/api/payments", paymentsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/admin", adminRouter);

export default app;