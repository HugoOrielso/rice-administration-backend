import { Request, Response } from "express";
import { prisma } from "../../database/db";

export async function getAllInvoices(_req: Request, res: Response) {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      ok: true,
      data: invoices,
    });
  } catch (error) {
    console.error("Error getting invoices:", error);
    return res.status(500).json({
      ok: false,
      error: "Internal error",
    });
  }
}


export async function getInvoiceByReference(req: Request, res: Response) {
  try {
    const invoiceNumberParam = req.params.invoiceNumber;

    const invoiceNumber = Array.isArray(invoiceNumberParam)
      ? invoiceNumberParam[0]
      : invoiceNumberParam;


    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: { items: true }
    });

    if (!invoice) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json({
      ok: true,
      data: invoice
    });

  } catch (error) {
    return res.status(500).json({ error: "Internal error" });
  }
}