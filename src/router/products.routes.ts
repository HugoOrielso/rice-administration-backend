import { Router } from "express";
import { validate } from "../middleware/validate.middleware";
import {
  createProductSchema,
  productIdParamSchema,
  updateProductSchema,
  updateProductStockSchema,
} from "../schemas/products/products.schema";

import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../generated/prisma/enums";
import { removeImageFromBody, uploadProductImage } from "../middleware/uploads.middleware";
import { createProduct, deactivateProduct, getProductById, getProducts, updateProduct, updateProductStock } from "../controllers/products/products.controller";

const productsRouter = Router();

productsRouter.get("/", getProducts);
productsRouter.get("/:id", validate(productIdParamSchema, "params"), getProductById);
productsRouter.post("/", requireAuth, requireRole(UserRole.ADMIN), uploadProductImage.single("image"), removeImageFromBody, validate(createProductSchema, "body"), createProduct);

productsRouter.patch("/:id", requireAuth, requireRole(UserRole.ADMIN), uploadProductImage.single("image"), validate(productIdParamSchema, "params"), validate(updateProductSchema, "body"), updateProduct);

productsRouter.patch("/:id/stock", requireAuth, requireRole(UserRole.ADMIN, UserRole.OPERATOR), validate(productIdParamSchema, "params"), validate(updateProductStockSchema, "body"), updateProductStock);

productsRouter.delete("/:id", requireAuth, requireRole(UserRole.ADMIN), validate(productIdParamSchema, "params"), deactivateProduct);

export default productsRouter;