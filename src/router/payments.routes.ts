import { Router } from "express";
import { createWompiCheckout } from "../controllers/payments/payments.controller";
import { wompiWebhook } from "../controllers/wompi/wompi.controller";


const paymentsRouter = Router();

paymentsRouter.post("/wompi/checkout", createWompiCheckout);
paymentsRouter.post("/wompi/webhook", wompiWebhook);

export default paymentsRouter;