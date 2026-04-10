import { Request, Response } from "express";
import crypto from "crypto";
import { DocumentType, InvoiceStatus } from "../../generated/prisma/enums";
import { prisma } from "../../database/db";
import { CreateWompiCheckoutInput } from "../../schemas/checkout/checkout.schema";
import { Prisma } from "../../generated/prisma/client";

export async function createWompiCheckout(
  req: Request<unknown, unknown, CreateWompiCheckoutInput>,
  res: Response
) {
  try {
    const { customer, items } = req.body;

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

    const integrityKey = process.env.WOMPI_INTEGRITY_KEY;
    const publicKey = process.env.WOMPI_PUBLIC_KEY;
    const frontendUrl = process.env.FRONTEND_URL;

    console.log("🔑 publicKey length:", publicKey?.length);
    console.log("🔑 publicKey JSON:", JSON.stringify(publicKey));

    if (!integrityKey) {
      return res.status(500).json({
        message: "Falta configurar WOMPI_INTEGRITY_KEY",
      });
    }

    if (!publicKey) {
      return res.status(500).json({
        message: "Falta configurar WOMPI_PUBLIC_KEY",
      });
    }

    if (!frontendUrl) {
      return res.status(500).json({
        message: "Falta configurar FRONTEND_URL",
      });
    }

    const amountInCents = total * 100;
    const reference = `ORDER-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    // ✅ Log 1: ver los valores exactos antes de generar la firma
    console.log("🔑 integrityKey:", integrityKey);
    console.log("📝 reference:", reference);
    console.log("💰 amountInCents:", amountInCents);
    console.log("🧮 string a hashear:", `${reference}${amountInCents}COP${integrityKey}`);

    const signature = crypto
      .createHash("sha256")
      .update(`${reference}${amountInCents}COP${integrityKey}`)
      .digest("hex");

    console.log("✍️ signature generada:", signature);

    // ✅ Log 2: ver el total antes de multiplicar
    console.log("💵 subtotal:", subtotal);
    console.log("💵 total:", total);
    console.log("💵 amountInCents:", amountInCents);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: reference,
        customerName: customer.fullName,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerAddress: customer.address,

        // usa los nombres REALES de tu modelo Prisma
        customerCity: customer.city,
        customerDepartment: customer.department,
        customerCountry: customer.country,

        documentType: customer.documentType as DocumentType,
        documentNumber: customer.documentNumber,
        subtotal,
        total,
        status: InvoiceStatus.PENDING,

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

    return res.status(200).json({
      ok: true,
      data: {
        invoiceId: invoice.id,
        reference,
        amountInCents,
        currency: "COP",
        publicKey,
        customerEmail: customer.email,
        signature,
        redirectUrl: `${frontendUrl}/checkout/resultado?reference=${reference}`,
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