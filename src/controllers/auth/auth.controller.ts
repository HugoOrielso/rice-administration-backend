import type { Request, Response } from "express";
import { comparePassword, hashPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/auth/auth.utils";
import { prisma } from "../../database/db";
import { loginSchema, registerSchema } from "../../schemas/auth/auth.schema";

export async function registerUser(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos inválidos",
        errors: parsed.error.flatten(),
      });
    }

    const { name, email, password, role } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: "Ya existe un usuario con ese correo",
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role ?? "ADMIN",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      ok: true,
      message: "Usuario creado correctamente",
      data: user,
    });
  } catch (error) {
    console.error("registerUser error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos inválidos",
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales inválidas",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        ok: false,
        message: "Usuario inactivo",
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales inválidas",
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return res.status(200).json({
      ok: true,
      message: "Login exitoso",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("loginUser error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
}

// Tipo compartido para el payload del token
type TokenPayload = { id: string; email: string; role: string };

export async function refreshSession(req: Request, res: Response) {
  try {
    const refreshToken = req.headers["x-refresh-token"] as string | undefined;

    if (!refreshToken) {
      return res.status(400).json({
        ok: false,
        message: "Refresh token requerido",
      });
    }

    let payload: TokenPayload;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        ok: false,
        message: "Refresh token inválido o expirado",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no autorizado",
      });
    }

    if (!user.refreshToken || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        ok: false,
        message: "Refresh token no válido",
      });
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return res.status(200).json({
      ok: true,
      message: "Sesión renovada correctamente",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("refreshSession error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
}

export async function logoutUser(req: Request, res: Response) {
  try {
    // ✅ CORREGIDO: el refresh token debe venir en x-refresh-token, igual que en refreshSession
    const refreshToken = req.headers["x-refresh-token"] as string | undefined;

    if (!refreshToken) {
      return res.status(400).json({
        ok: false,
        message: "Refresh token requerido", // ✅ Mensaje ahora es coherente
      });
    }

    let payload: { id: string };

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      // Token inválido o expirado — igual se considera sesión cerrada
      return res.status(200).json({
        ok: true,
        message: "Sesión cerrada",
      });
    }

    await prisma.user.updateMany({
      where: {
        id: payload.id,
        refreshToken,
      },
      data: {
        refreshToken: null,
      },
    });

    return res.status(200).json({
      ok: true,
      message: "Logout exitoso",
    });
  } catch (error) {
    console.error("logoutUser error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
}