import { Request, Response } from "express";
import { InvoiceStatus } from "../../generated/prisma/enums";
import { prisma } from "../../database/db";
import { Prisma } from "../../generated/prisma/client";
import { WompiWebhookPayload } from "../../types/wompi";
import { mapWompiStatusToInvoiceStatus, validateWompiWebhook } from "../../utils/wompi/utilsWompi";


export async function wompiWebhook(req: Request, res: Response) {
  try {
    const payload = req.body as WompiWebhookPayload;
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET?.trim();

    if (!eventsSecret) {
      return res.status(500).json({ error: "Webhook no configurado" });
    }

    // 🔐 Validar firma
    const isValid = validateWompiWebhook(payload, eventsSecret);

    if (!isValid) {
      console.error("❌ Firma inválida de Wompi");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // 🧠 Solo procesamos este evento
    if (payload.event !== "transaction.updated") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const transaction = payload.data?.transaction;

    if (!transaction?.reference) {
      return res.status(400).json({ error: "Reference no encontrada" });
    }

    const reference = transaction.reference;
    const wompiTransactionId = transaction.id ?? null;
    const wompiStatus = transaction.status ?? "PENDING";
    const nextStatus = mapWompiStatusToInvoiceStatus(wompiStatus);

    // 🔎 Buscar factura
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: reference },
      include: { items: true },
    });

    if (!invoice) {
      console.warn(`⚠️ Invoice no encontrada: ${reference}`);
      return res.status(200).json({ ok: true, warning: "invoice_not_found" });
    }

    // 🛑 Idempotencia fuerte (clave)
    if (invoice.status === InvoiceStatus.PAID) {
      return res.status(200).json({ ok: true, already_processed: true });
    }

    // 🚀 Transacción atómica
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar factura
      const updatedInvoice = await tx.invoice.update({
        where: { invoiceNumber: reference },
        data: {
          status: nextStatus,
          wompiStatus,
          wompiTransactionId,
          paymentMethodType: transaction.payment_method_type ?? null,
          wompiPayload: payload as unknown as Prisma.InputJsonValue,
        },
      });

      // 2. Descontar stock SOLO si pagó
      if (nextStatus === InvoiceStatus.PAID) {
        for (const item of invoice.items) {
          if (!item.productId) continue;

          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new Error(`Producto no encontrado: ${item.productId}`);
          }

          if (product.stock < item.quantity) {
            throw new Error(
              `Stock insuficiente para producto ${item.productId}`
            );
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("❌ Error en webhook de Wompi:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getInvoiceByReference(req: Request, res: Response) {
  try {
    const invoiceNumberParam = req.params.invoiceNumber;

    const invoiceNumber = Array.isArray(invoiceNumberParam)
      ? invoiceNumberParam[0]
      : invoiceNumberParam;

      console.log("entre")

      console.log(invoiceNumber)
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json({
      status: invoice.status,
    });

  } catch (error) {
    return res.status(500).json({ error: "Internal error" });
  }
}