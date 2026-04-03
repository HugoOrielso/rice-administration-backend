import { Request, Response } from "express";
import { prisma } from "../../database/db";
import { DocumentType, InvoiceStatus } from "../../generated/prisma/enums";
import crypto from "crypto";

interface CheckoutCustomer {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  address: string;
  email: string;
  phone: string;
  city: string;
}

interface CheckoutItem {
  productId: string;
  quantity: number;
}

interface CreateWompiCheckoutBody {
  customer: CheckoutCustomer;
  items: CheckoutItem[];
}

export async function createWompiCheckout(
  req: Request<unknown, unknown, CreateWompiCheckoutBody>,
  res: Response
) {
  try {
    const { customer, items } = req.body;

    if (!customer) {
      return res.status(400).json({
        message: "Los datos del cliente son obligatorios",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Debes enviar al menos un producto",
      });
    }

    const requiredCustomerFields: (keyof CheckoutCustomer)[] = [
      "fullName",
      "documentType",
      "documentNumber",
      "address",
      "email",
      "phone",
      "city",
    ];

    for (const field of requiredCustomerFields) {
      if (!customer[field]?.toString().trim()) {
        return res.status(400).json({
          message: `El campo ${field} es obligatorio`,
        });
      }
    }

    const invalidItem = items.find(
      (item) => !item.productId || Number(item.quantity) <= 0
    );

    if (invalidItem) {
      return res.status(400).json({
        message: "Hay productos inválidos en la compra",
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
        throw new Error(`Stock insuficiente para ${product.name}`);
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

    const subtotal = normalizedItems.reduce((acc, item) => acc + item.lineTotal, 0);
    const total = subtotal;

    if (total <= 0) {
      return res.status(400).json({
        message: "El total de la compra no es válido",
      });
    }

    const amountInCents = total * 100;
    const reference = `ORDER-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")}`;

    const integrityKey = process.env.WOMPI_INTEGRITY_KEY;

    if (!integrityKey) {
      return res.status(500).json({
        message: "Falta configurar WOMPI_INTEGRITY_KEY",
      });
    }

    if (!process.env.WOMPI_PUBLIC_KEY) {
      return res.status(500).json({
        message: "Falta configurar WOMPI_PUBLIC_KEY",
      });
    }

    const signature = crypto
      .createHash("sha256")
      .update(`${reference}${amountInCents}COP${integrityKey}`)
      .digest("hex");

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: reference,
        customerName: customer.fullName,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        documentType: customer.documentType as DocumentType,
        documentNumber: customer.documentNumber,
        subtotal,
        total,
        status: InvoiceStatus.PENDING,
        items: {
          create: normalizedItems.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            packageLabel: item.product.packageLabel,
            unitsPerPackage: item.product.unitsPerPackage,
            unitWeightGrams: item.product.unitWeightGrams,
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
        publicKey: process.env.WOMPI_PUBLIC_KEY,
        customerEmail: customer.email,
        redirectUrl: `${process.env.FRONTEND_URL}/checkout/resultado?reference=${reference}`,
        signature,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Error interno al iniciar el checkout",
    });
  }
}