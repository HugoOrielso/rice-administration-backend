import { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import { InvoiceStatus, OrderStatus } from "../../generated/prisma/enums";
import { prisma } from "../../database/db";
import { WompiWebhookPayload } from "../../types/wompi";
import {
  mapWompiStatusToInvoiceStatus,
  validateWompiWebhook,
} from "../../utils/wompi/utilsWompi";

export async function wompiWebhook(req: Request, res: Response) {
  try {
    const payload = req.body as WompiWebhookPayload;
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET?.trim();

    if (!eventsSecret) {
      return res.status(500).json({ error: "Webhook no configurado" });
    }
    console.log(payload)
    const isValid = validateWompiWebhook(payload, eventsSecret);

    if (!isValid) {
      console.error("❌ Firma inválida de Wompi");
      return res.status(401).json({ error: "Invalid signature" });
    }

    if (payload.event !== "transaction.updated") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const transaction = payload.data?.transaction;

    if (!transaction) {
      return res.status(400).json({ error: "Transaction no encontrada" });
    }
    const reference = transaction.reference;
    const wompiTransactionId = transaction.id ?? null;
    const wompiStatus = transaction.status ?? "PENDING";
    const nextInvoiceStatus = mapWompiStatusToInvoiceStatus(wompiStatus);
    const paymentLinkId = transaction.payment_link_id ?? null;
    const wompiReference = transaction.reference ?? null;

    // Extraer ORDER-... del redirect_url como fallback real
    let orderReference: string | null = null;

    if (transaction.redirect_url) {
      try {
        const url = new URL(transaction.redirect_url);

        // Ejemplo: /payments/ORDER-1775809398904-28adbbaa
        const pathSegments = url.pathname.split("/").filter(Boolean);
        const refFromPath = pathSegments[pathSegments.length - 1] ?? null;

        if (refFromPath) {
          orderReference = decodeURIComponent(refFromPath);
        }
      } catch (error) {
        console.warn("⚠️ No se pudo parsear redirect_url:", error);
      }
    }

    console.log("📋 wompiReference:", wompiReference);
    console.log("📋 paymentLinkId:", paymentLinkId);
    console.log("📋 orderReference:", orderReference);

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(paymentLinkId ? [{ wompiPaymentLinkId: paymentLinkId }] : []),
          ...(orderReference ? [{ reference: orderReference }] : []),
        ],
      },
      include: { items: true },
    });

    if (!order) {
      console.warn("⚠️ Order no encontrada", {
        wompiReference,
        paymentLinkId,
        orderReference,
      });

      return res.status(200).json({
        ok: true,
        warning: "order_not_found",
      });
    }

    const mapOrderStatus = (status: string): OrderStatus => {
      switch (status) {
        case "APPROVED":
          return OrderStatus.PAID;
        case "DECLINED":
          return OrderStatus.DECLINED;
        case "VOIDED":
        case "CANCELLED":
          return OrderStatus.CANCELLED;
        case "ERROR":
          return OrderStatus.ERROR;
        case "EXPIRED":
          return OrderStatus.EXPIRED;
        default:
          return OrderStatus.PENDING;
      }
    };

    const nextOrderStatus = mapOrderStatus(wompiStatus);
    const invoiceNumber = orderReference ?? reference;

    await prisma.$transaction(async (tx) => {

      // 1) Si no está pagado, solo sincroniza estado de la orden
      if (nextInvoiceStatus !== InvoiceStatus.PAID) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: nextOrderStatus,
            wompiStatus,
            wompiTransactionId,
            paymentMethodType: transaction.payment_method_type ?? null,
            wompiPayload: payload as unknown as Prisma.InputJsonValue,
          },
        });

        return;
      }

      // 2) Idempotencia por transactionId
      const existingInvoiceByTransaction =
        wompiTransactionId
          ? await tx.invoice.findFirst({
            where: { wompiTransactionId },
          })
          : null;

      if (existingInvoiceByTransaction) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            wompiStatus,
            wompiTransactionId,
            paymentMethodType: transaction.payment_method_type ?? null,
            wompiPayload: payload as unknown as Prisma.InputJsonValue,
            processedAt: order.processedAt ?? new Date(),
          },
        });

        return;
      }

      // 3) Idempotencia por invoiceNumber
      const existingInvoiceByNumber = await tx.invoice.findUnique({
        where: { invoiceNumber },
      });

      if (existingInvoiceByNumber) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            wompiStatus,
            wompiTransactionId,
            paymentMethodType: transaction.payment_method_type ?? null,
            wompiPayload: payload as unknown as Prisma.InputJsonValue,
            processedAt: order.processedAt ?? new Date(),
          },
        });

        return;
      }

      // 4) Validar stock antes de crear factura
      for (const item of order.items) {
        if (!item.productId) {
          throw new Error(`El item ${item.id} no tiene productId`);
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Producto no encontrado: ${item.productId}`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para producto ${item.productId}`);
        }
      }

      // 5) Crear factura
      await tx.invoice.create({
        data: {
          invoiceNumber: invoiceNumber ?? '',
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          customerAddress: order.customerAddress,
          customerPhonePrefix: order.customerPhonePrefix,
          customerCountry: order.customerCountry,
          customerDepartment: order.customerDepartment,
          customerCity: order.customerCity,
          documentType: order.documentType,
          documentNumber: order.documentNumber,
          subtotal: order.subtotal,
          total: order.total,
          status: InvoiceStatus.PAID,
          wompiTransactionId,
          wompiStatus,
          paymentMethodType: transaction.payment_method_type ?? null,
          wompiPayload: payload as unknown as Prisma.InputJsonValue,
          wompiPaymentLinkId: order.wompiPaymentLinkId,
          items: {
            create: order.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              packageLabel: item.packageLabel,
              unitsPerPackage: item.unitsPerPackage,
              unitWeightGrams: item.unitWeightGrams,
            })),
          },
        },
      });

      // 6) Descontar stock
      for (const item of order.items) {
        if (!item.productId) continue;

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 7) Marcar orden como pagada
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          wompiStatus,
          wompiTransactionId,
          paymentMethodType: transaction.payment_method_type ?? null,
          wompiPayload: payload as unknown as Prisma.InputJsonValue,
          processedAt: order.processedAt ?? new Date(),
        },
      });
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("❌ Error en webhook de Wompi:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}