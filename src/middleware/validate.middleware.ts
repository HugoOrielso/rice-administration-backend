// src/middlewares/validate.ts
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type RequestPart = "body" | "params" | "query";

export function validate(schema: ZodSchema, target: RequestPart = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: result.error.flatten(),
      });
    }

    req[target] = result.data;
    next();
  };
}