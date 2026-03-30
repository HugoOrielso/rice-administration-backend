// src/modules/auth/auth.schemas.ts
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener mínimo 6 caracteres"),
  role: z.enum(["ADMIN", "OPERATOR"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token requerido"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;