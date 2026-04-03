import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../generated/prisma/enums";
import { getAdminOverview } from "../controllers/admin/admin.controller";

const adminRouter = Router();

adminRouter.get(
  "/overview",
  requireAuth,
  requireRole(UserRole.ADMIN),
  getAdminOverview
);

export default adminRouter;