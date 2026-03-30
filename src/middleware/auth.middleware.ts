// src/middlewares/auth.middleware.ts
import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/auth/auth.utils";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        message: "Token requerido",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      ok: false,
      message: "Token inválido o expirado",
    });
  }
}