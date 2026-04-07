import { Router } from "express";
import { createWompiCheckout } from "../controllers/payments/payments.controller";
import { wompiWebhook } from "../controllers/wompi/wompi.controller";
import { validate } from "../middleware/validate.middleware";
import { createWompiCheckoutSchema } from "../schemas/checkout/checkout.schema";


const paymentsRouter = Router();

paymentsRouter.post("/wompi/checkout", validate(createWompiCheckoutSchema),  createWompiCheckout);
paymentsRouter.post("/wompi/webhook", wompiWebhook);

export default paymentsRouter;