import { z } from "zod";

export const createProductSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre no puede superar 120 caracteres"),

  slug: z
    .string()
    .trim()
    .min(2, "El slug es obligatorio")
    .max(150, "El slug no puede superar 150 caracteres")
    .regex(
      /^[a-z0-9-]+$/,
      "El slug solo puede contener minúsculas, números y guiones"
    ),

  details: z
    .string()
    .trim()
    .max(5000, "Los detalles no pueden superar 5000 caracteres")
    .optional(),

  price: z.coerce.number().positive("El precio debe ser mayor a 0"),

  stock: z.coerce
    .number()
    .int("El stock debe ser un número entero")
    .min(0, "El stock no puede ser negativo")
    .default(0),

  minStock: z.coerce
    .number()
    .int("El stock mínimo debe ser un número entero")
    .min(0, "El stock mínimo no puede ser negativo")
    .default(0),

  packageLabel: z
    .string()
    .trim()
    .min(1, "La etiqueta del paquete no puede estar vacía")
    .max(50, "La etiqueta del paquete no puede superar 50 caracteres")
    .optional(),

  unitsPerPackage: z.coerce
    .number()
    .int("Las unidades por paquete deben ser un número entero")
    .positive("Las unidades por paquete deben ser mayores a 0")
    .optional(),

  unitWeightGrams: z.coerce
    .number()
    .positive("El peso por unidad debe ser mayor a 0")
    .optional(),

  isActive: z.coerce.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const updateProductStockSchema = z.strictObject({
  stock: z.coerce
    .number()
    .int("El stock debe ser un número entero")
    .min(0, "El stock no puede ser negativo"),
});

export const productIdParamSchema = z.strictObject({
  id: z.string().trim().min(1, "El id es obligatorio"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateProductStockInput = z.infer<typeof updateProductStockSchema>;