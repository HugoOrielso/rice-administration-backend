import { Request, Response } from "express";
import { prisma } from "../../database/db";

export async function getAdminOverview(req: Request, res: Response) {
    try {
        const now = new Date();

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const [monthlyInvoices, totalProducts, latestInvoices] =
            await Promise.all([
                prisma.invoice.aggregate({
                    _sum: { total: true },
                    where: {
                        createdAt: {
                            gte: startOfMonth,
                            lt: startOfNextMonth,
                        },
                        status: {
                            in: ["PAID"],
                        },
                    },
                }),

                prisma.product.count(),

                prisma.invoice.findMany({
                    take: 3,
                    orderBy: {
                        createdAt: "desc",
                    },
                    select: {
                        id: true,
                        invoiceNumber: true,
                        customerName: true,
                        total: true,
                        status: true,
                        createdAt: true,
                    },
                }),
            ]);

        return res.json({
            ok: true,
            data: {
                monthBilling: Number(monthlyInvoices._sum.total ?? 0),
                totalProducts,
                latestInvoices,
            },
        });
    } catch (error) {
        console.error("Error getting admin overview:", error);

        return res.status(500).json({
            ok: false,
            message: "Error interno del servidor",
        });
    }
}