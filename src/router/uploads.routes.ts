// src/routes/upload.routes.ts
import { Router } from "express";
import { UserRole } from "../generated/prisma/enums";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { uploadProductImage } from "../middleware/uploads.middleware";

const uploadRoutes = Router();

uploadRoutes.post(
  "/product-image",
  requireAuth,
  requireRole(UserRole.ADMIN),
  uploadProductImage.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: "No se envió ninguna imagen",
      });
    }

    const imageUrl = `/uploads/products/${req.file.filename}`;

    return res.status(201).json({
      message: "Imagen subida correctamente",
      imageUrl,
    });
  }
);

export default uploadRoutes;