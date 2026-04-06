import type { Request, Response } from "express";
import { comparePassword, hashPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/auth/auth.utils";
import { prisma } from "../../database/db";
import { loginSchema, registerSchema } from "../../schemas/auth/auth.schema";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";

const cookieOptions = {
  httpOnly: true,
  secure: true, // obligatorio con sameSite: "none"
  sameSite: "none" as const,
  path: "/",
};

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

    // ✅ Guardar hash del refresh token, no el token en texto plano
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashToken(refreshToken) },
    });


    // ✅ secure y sameSite dinámicos
    res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 1000 * 60 * 15 });
    res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 7 });

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
import { createHash } from "crypto";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function refreshSession(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    console.log(refreshToken)
    if (!refreshToken) {
      return res.status(401).json({
        ok: false,
        message: "No refresh token provided",
      });
    }

    // ✅ try/catch propio para distinguir token inválido/expirado
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        ok: false,
        message: "Refresh token expirado o inválido",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Usuario no encontrado",
      });
    }

    // ✅ Verificar usuario activo
    if (!user.isActive) {
      return res.status(403).json({
        ok: false,
        message: "Usuario inactivo",
      });
    }

    // ✅ Comparar contra el hash guardado en BD
    if (user.refreshToken !== hashToken(refreshToken)) {
      return res.status(401).json({
        ok: false,
        message: "Refresh token inválido",
      });
    }

    // ✅ Rotación: generar nuevos tokens
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    // ✅ Guardar el hash del nuevo refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashToken(newRefreshToken) },
    });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("accessToken", newAccessToken, { ...cookieOptions, maxAge: 1000 * 60 * 15 });
    res.cookie("refreshToken", newRefreshToken, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 7 });

    console.log("refresh")
    return res.status(200).json({
      ok: true,
      message: "Sesión refrescada",
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
    const refreshToken = req.cookies.refreshToken as string | undefined;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);

        await prisma.user.updateMany({
          where: {
            id: payload.id,
            refreshToken: hashToken(refreshToken), // ✅ comparar contra el hash
          },
          data: {
            refreshToken: null,
          },
        });
      } catch {
        // aunque el token esté vencido o mal, seguimos cerrando sesión
      }
    }

    const isProduction = process.env.NODE_ENV === "production";

    // ✅ Limpiar ambas cookies, no solo refreshToken
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

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

export async function getMe(req: AuthenticatedRequest, res: Response) {
  console.log("entre")
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ ok: false, message: "No autenticado" });
  }

  return res.status(200).json({ ok: true, data: { user } });
}