import { Router } from "express";
import { getAllInvoices, getInvoiceByReference } from "../controllers/invoices/invoices.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../generated/prisma/enums";

const invoicesRouter = Router();

invoicesRouter.get("/:invoiceNumber", getInvoiceByReference);
invoicesRouter.get("/", requireAuth, requireRole(UserRole.ADMIN), getAllInvoices);

export default invoicesRouter;