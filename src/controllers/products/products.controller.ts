// src/controllers/product.controller.ts
import { Request, Response } from "express";
import path from "node:path";
import fs from "fs";
import { prisma } from "../../database/db";
import { ProductService } from "../../services/products/products.service";
import { uploadBufferToCloudinary } from "../../utils/cloudinary/upload";
import cloudinary from "../../config/cloudinary";

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

export async function createProduct(req: MulterRequest, res: Response) {
    try {
        console.log("asdsksdajij")
        let imageUrl: string | null = null;

        if (req.file) {
            imageUrl = await uploadBufferToCloudinary(req.file.buffer, "products");
        }

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
            error: error?.message,
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


function getCloudinaryPublicIdFromUrl(url: string): string | null {
    try {
        const parts = url.split("/");
        const uploadIndex = parts.findIndex((part) => part === "upload");

        if (uploadIndex === -1) return null;

        const publicPath = parts.slice(uploadIndex + 2).join("/");
        const withoutExtension = publicPath.replace(/\.[^/.]+$/, "");

        return withoutExtension || null;
    } catch {
        return null;
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

        if (req.file) {
            const newImageUrl = await uploadBufferToCloudinary(req.file.buffer, "products");

            if (existingProduct.imageUrl) {
                const publicId = getCloudinaryPublicIdFromUrl(existingProduct.imageUrl);

                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId, {
                            resource_type: "image",
                        });
                    } catch (destroyError) {
                        console.error("Error borrando imagen anterior de Cloudinary:", destroyError);
                    }
                }
            }

            imageUrl = newImageUrl;
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

        console.error("updateProduct error:", error);

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