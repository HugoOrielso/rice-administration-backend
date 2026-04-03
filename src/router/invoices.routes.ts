import { Router } from "express";
import { getInvoiceByReference } from "../controllers/wompi/wompi.controller";

const invoicesRouter = Router();


invoicesRouter.get("/:invoiceNumber", getInvoiceByReference);



export default invoicesRouter;