// src/controllers/product.controller.ts
import { Request, Response } from "express";
import { ProductService } from "../../../services/products/products.service";
import path from "node:path";
import fs from "fs";
import { prisma } from "../../../database/db";

type MulterRequest = Request & {
    file?: any
};


export async function createProduct(req: MulterRequest, res: Response) {
    try {
        const imageUrl = req.file
            ? `/uploads/products/${req.file.filename}`
            : null;

        const product = await ProductService.create({
            ...req.body,
            imageUrl,
        });

        return res.status(201).json({
            message: "Producto creado correctamente",
            data: product,
        });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return res.status(409).json({
                message: "Ya existe un producto con ese slug",
            });
        }

        console.error("createProduct error:", error);
        return res.status(500).json({
            message: "Error creando producto",
        });
    }
}

export async function getProducts(_req: Request, res: Response) {
    try {
        const products = await ProductService.findAll();
        return res.json(products);
    } catch (error) {
        console.error("getProducts error:", error);
        return res.status(500).json({
            message: "Error listando productos",
        });
    }
}

export async function getProductById(req: Request, res: Response) {
    try {
        const product = await ProductService.findById(String(req.params.id) ?? '');

        if (!product) {
            return res.status(404).json({
                message: "Producto no encontrado",
            });
        }

        return res.json(product);
    } catch (error) {
        console.error("getProductById error:", error);
        return res.status(500).json({
            message: "Error obteniendo producto",
        });
    }
}

export async function updateProduct(req: MulterRequest, res: Response) {
    try {
        const id = String(req.params.id);

        const existingProduct = await prisma.product.findUnique({
            where: { id },
        });

        if (!existingProduct) {
            return res.status(404).json({
                message: "Producto no encontrado",
            });
        }

        let imageUrl = existingProduct.imageUrl;

        // 2. Si viene nueva imagen
        if (req.file) {
            // 👉 borrar imagen anterior si existe
            if (existingProduct.imageUrl) {
                const oldPath = path.resolve(
                    "uploads",
                    existingProduct.imageUrl.replace("/uploads/", "")
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            imageUrl = `/uploads/products/${req.file.filename}`;
        }

        const product = await ProductService.update(id, {
            ...req.body,
            imageUrl,
        });

        return res.json({
            message: "Producto actualizado correctamente",
            data: product,
        });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return res.status(409).json({
                message: "Ya existe un producto con ese slug",
            });
        }

        return res.status(500).json({
            message: "Error actualizando producto",
        });
    }
}

export async function updateProductStock(req: Request, res: Response) {
    try {
        const product = await ProductService.updateStock(String(req.params.id) ?? '', req.body.stock);
        return res.json(product);
    } catch (error: any) {
        if (error?.code === "P2025") {
            return res.status(404).json({
                message: "Producto no encontrado",
            });
        }

        console.error("updateProductStock error:", error);
        return res.status(500).json({
            message: "Error actualizando stock",
        });
    }
}

export async function deactivateProduct(req: Request, res: Response) {
    try {
        const product = await ProductService.update(String(req.params.id) ?? '', {
            isActive: false,
        });

        return res.json(product);
    } catch (error: any) {
        if (error?.code === "P2025") {
            return res.status(404).json({
                message: "Producto no encontrado",
            });
        }

        console.error("deactivateProduct error:", error);
        return res.status(500).json({
            message: "Error desactivando producto",
        });
    }
}