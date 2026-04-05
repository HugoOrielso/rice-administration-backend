import type { NextFunction, Request, Response } from "express";
import { UserRole } from "../generated/prisma/enums";
import { verifyAccessToken } from "../utils/auth/auth.utils";
import jwt from "jsonwebtoken";


export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    let token: string | undefined;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: "Token requerido",
      });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          ok: false,
          message: "Token expirado",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          ok: false,
          message: "Token inválido",
        });
      }
    }

    console.error("requireAuth error:", error);
    return res.status(401).json({
      ok: false,
      message: "No autenticado",
    });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para acceder a este recurso", // ✅ en español
      });
    }

    next();
  };
}