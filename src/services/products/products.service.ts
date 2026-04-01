import { prisma } from "../../database/db";
import { Prisma } from "../../generated/prisma/client";
import {
  CreateProductInput,
  UpdateProductInput,
} from "../../schemas/products/products.schema";

type CreateProductWithImageInput = CreateProductInput & {
  imageUrl?: string | null;
};

export class ProductService {
  static async create(data: CreateProductWithImageInput) {
    return prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        details: data.details || null,
        imageUrl: data.imageUrl ?? null,
        price: data.price,
        stock: data.stock ?? 0,
        minStock: data.minStock ?? 0,
        packageLabel: data.packageLabel ?? null,
        unitsPerPackage: data.unitsPerPackage ?? null,
        unitWeightGrams:
          data.unitWeightGrams !== undefined && data.unitWeightGrams !== null
            ? data.unitWeightGrams
            : null,
        isActive: data.isActive ?? true,
      },
    });
  }

  static async findAll() {
    return prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  static async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
    });
  }

  static async update(id: string, data: UpdateProductInput) {
    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.imageUrl !== undefined && {
          imageUrl: data.imageUrl ?? null,
        }),
        ...(data.details !== undefined && {
          details: data.details ?? null,
        }),
        ...(data.price !== undefined && {
          price: data.price,
        }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.packageLabel !== undefined && {
          packageLabel: data.packageLabel ?? null,
        }),
        ...(data.unitsPerPackage !== undefined && {
          unitsPerPackage: data.unitsPerPackage ?? null,
        }),
        ...(data.unitWeightGrams !== undefined && {
          unitWeightGrams:
            data.unitWeightGrams !== null
              ? data.unitWeightGrams
              : null,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  static async updateStock(id: string, stock: number) {
    return prisma.product.update({
      where: { id },
      data: { stock },
    });
  }
}