import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../../database/db";
import { CreateWompiCheckoutInput } from "../../schemas/checkout/checkout.schema";
import { Prisma } from "../../generated/prisma/client";
import { DocumentType, OrderStatus } from "../../generated/prisma/enums";

const wompiLegalIdTypeMap: Record<string, string> = {
  REGISTRO_CIVIL: "RC",
  TARJETA_EXTRANJERIA: "TE",
  CEDULA_CIUDADANIA: "CC",
  CEDULA_EXTRANJERIA: "CE",
  NIT: "NIT",
  PASAPORTE: "PP",
  TARJETA_IDENTIDAD: "TI",
  DNI: "CC",
  CARTEIRA_IDENTIDADE: "CC",
  OTRO: "CC",
};

export async function createWompiCheckout(
  req: Request<unknown, unknown, CreateWompiCheckoutInput>,
  res: Response
) {
  try {
    const { customer, items } = req.body;

    if (!items?.length) {
      return res.status(400).json({
        message: "El carrito no puede estar vacío",
      });
    }

    const productIds = [...new Set(items.map((item) => item.productId))];

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        message: "Uno o más productos no existen o no están activos",
      });
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    const normalizedItems = items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error(`Producto no encontrado: ${item.productId}`);
      }

      if (product.stock < item.quantity) {
        return {
          error: `Stock insuficiente para ${product.name}`,
        };
      }

      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * item.quantity;

      return {
        product,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const stockError = normalizedItems.find((item) => "error" in item);
    if (stockError && "error" in stockError) {
      return res.status(400).json({
        message: stockError.error,
      });
    }

    const safeItems = normalizedItems.filter(
      (item): item is Exclude<(typeof normalizedItems)[number], { error: string }> =>
        !("error" in item)
    );

    const subtotal = safeItems.reduce((acc, item) => acc + item.lineTotal, 0);
    const total = subtotal;

    if (total <= 0) {
      return res.status(400).json({
        message: "El total de la compra no es válido",
      });
    }

    const privateKey = process.env.WOMPI_PRIVATE_KEY;
    const frontendUrl = process.env.FRONTEND_URL;

    if (!privateKey) {
      return res.status(500).json({
        message: "Falta configurar WOMPI_PRIVATE_KEY",
      });
    }

    if (!frontendUrl) {
      return res.status(500).json({
        message: "Falta configurar FRONTEND_URL",
      });
    }

    const amountInCents = Math.round(total * 100);
    const reference = `ORDER-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    const order = await prisma.order.create({
      data: {
        reference,
        customerName: customer.fullName,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerCountry: customer.country,
        customerDepartment: customer.department,
        customerCity: customer.city,
        documentType: customer.documentType as DocumentType,
        documentNumber: customer.documentNumber,
        subtotal,
        total,
        status: OrderStatus.PENDING,
        items: {
          create: safeItems.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            packageLabel: item.product.packageLabel,
            unitsPerPackage: item.product.unitsPerPackage,
            unitWeightGrams:
              item.product.unitWeightGrams != null
                ? new Prisma.Decimal(item.product.unitWeightGrams)
                : null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    const wompiResponse = await fetch("https://production.wompi.co/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${privateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Pedido ${reference}`,
        description: safeItems.map((i) => `${i.product.name} x${i.quantity}`).join(", "),
        single_use: true,
        collect_shipping: false,
        currency: "COP",
        amount_in_cents: amountInCents,
        redirect_url: `${frontendUrl}/payments/${reference}`,
        reference,
        image_url: null,
        customer_data: {
          email: customer.email,
          full_name: customer.fullName,
          phone_number: customer.phone,
          legal_id: customer.documentNumber,
          legal_id_type: wompiLegalIdTypeMap[customer.documentType] ?? "CC",
        },
      }),
    });

    const wompiData = await wompiResponse.json();

    if (!wompiResponse.ok) {
      console.error("❌ Wompi error:", JSON.stringify(wompiData, null, 2));

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.ERROR,
          wompiPayload: wompiData as Prisma.InputJsonValue,
        },
      });

      return res.status(500).json({
        message: "Error creando link de pago en Wompi",
      });
    }

    const paymentLinkId = wompiData?.data?.id;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        wompiPaymentLinkId: paymentLinkId,
      },
    });

    return res.status(200).json({
      ok: true,
      data: {
        orderId: order.id,
        reference,
        paymentUrl: `https://checkout.wompi.co/l/${paymentLinkId}`,
      },
    });
  } catch (error) {
    console.error("Error creando checkout de Wompi:", error);

    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Error interno al iniciar el checkout",
    });
  }
}